import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-trailing-stop-maintainer",
  name: "Hyperliquid Trailing Stop Maintainer",
  description:
    "Inspect open positions and protective orders, then compute and optionally apply trailing-stop updates.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", default: "" },
    { name: "breakevenTriggerPct", type: "number", default: 0.015 },
    { name: "trailDistancePct", type: "number", default: 0.01 },
    { name: "maxStopUpdatesPerRun", type: "number", default: 6 },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_stop_context",
      type: "ts",
      allow: [
        "getHyperliquidPositions",
        "getHyperliquidOpenOrders",
        "getHyperliquidPrices",
        "fetchHyperliquidCandles"
      ],
      code: `
const parseUniverse = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
const unwrap = (value) => {
  if (value && typeof value === "object" && "data" in value) return value.data;
  return value;
};
const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.positions)) return value.positions;
  if (Array.isArray(value?.orders)) return value.orders;
  return [];
};
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const [positionsRaw, openOrdersRaw, pricesRaw] = await Promise.all([
  callTool("getHyperliquidPositions", {}),
  callTool("getHyperliquidOpenOrders", {}),
  callTool("getHyperliquidPrices", { coins: parseUniverse(inputs.coinUniverse) }),
]);

const positions = toArray(unwrap(positionsRaw))
  .map((position) => ({
    coin: String(position.coin ?? position.asset ?? "").toUpperCase(),
    side: String(position.side ?? "").toLowerCase().includes("short") ? "short" : "long",
    size: Math.abs(toNumber(position.size ?? position.szi ?? 0)),
    entryPrice: toNumber(position.entryPrice ?? position.entryPx ?? 0),
    markPrice: toNumber(position.markPrice ?? position.markPx ?? 0),
  }))
  .filter((position) => position.coin && position.size > 0 && position.entryPrice > 0);

const openOrders = toArray(unwrap(openOrdersRaw)).map((order) => ({
  orderId: order.orderId ?? order.oid ?? order.id ?? null,
  coin: String(order.coin ?? order.asset ?? "").toUpperCase(),
  side: String(order.side ?? "").toLowerCase(),
  reduceOnly: Boolean(order.reduceOnly ?? false),
  triggerPrice: toNumber(order.triggerPrice ?? order.stopPx ?? 0),
}));

const pricesPayload = unwrap(pricesRaw);
const prices =
  pricesPayload && typeof pricesPayload === "object" && "prices" in pricesPayload
    ? pricesPayload.prices
    : pricesPayload ?? {};

const candlesByCoin = {};
for (const position of positions) {
  candlesByCoin[position.coin] = await callTool("fetchHyperliquidCandles", {
    coin: position.coin,
    interval: "1h",
  });
}

export default { positions, openOrders, prices, candlesByCoin };
`
    },
    {
      id: "plan_stop_updates",
      type: "ts",
      depends_on: ["fetch_stop_context"],
      code: `
const state = steps.fetch_stop_context?.result ?? {};
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const breakevenTriggerPct = Math.max(toNumber(inputs.breakevenTriggerPct, 0.015), 0.001);
const trailDistancePct = Math.max(toNumber(inputs.trailDistancePct, 0.01), 0.001);
const maxStopUpdatesPerRun = Math.max(Math.floor(toNumber(inputs.maxStopUpdatesPerRun, 6)), 1);
const dryRun = Boolean(inputs.dryRun);

const stopOrdersForCoin = (coin) =>
  (Array.isArray(state.openOrders) ? state.openOrders : []).filter(
    (order) => order.coin === coin && order.reduceOnly && toNumber(order.triggerPrice, 0) > 0,
  );

const updates = [];
for (const position of Array.isArray(state.positions) ? state.positions : []) {
  const priceMovePct =
    position.side === "long"
      ? (position.markPrice - position.entryPrice) / position.entryPrice
      : (position.entryPrice - position.markPrice) / position.entryPrice;
  if (priceMovePct < breakevenTriggerPct) continue;

  const desiredStopPrice =
    position.side === "long"
      ? Math.max(
          position.entryPrice,
          position.markPrice * (1 - trailDistancePct),
        )
      : Math.min(
          position.entryPrice,
          position.markPrice * (1 + trailDistancePct),
        );
  const existingStops = stopOrdersForCoin(position.coin);
  const existingStopPrice = toNumber(existingStops[0]?.triggerPrice, 0);
  const needsUpdate =
    existingStops.length === 0 ||
    Math.abs(desiredStopPrice - existingStopPrice) / Math.max(desiredStopPrice, 1) >
      0.001;
  if (!needsUpdate) continue;

  updates.push({
    coin: position.coin,
    side: position.side === "long" ? "sell" : "buy",
    size: Number(position.size.toFixed(6)),
    desiredStopPrice: Number(desiredStopPrice.toFixed(2)),
    existingStopOrderIds: existingStops.map((order) => order.orderId),
    priceMovePct: Number(priceMovePct.toFixed(4)),
  });
}

export default {
  dryRun,
  params: { breakevenTriggerPct, trailDistancePct, maxStopUpdatesPerRun },
  updates: updates.slice(0, maxStopUpdatesPerRun),
};
`
    },
    {
      id: "apply_stop_updates",
      type: "ts",
      depends_on: ["plan_stop_updates"],
      allow: ["cancelHyperliquidOrder", "placeHyperliquidStopOrder"],
      code: `
const plan = steps.plan_stop_updates?.result ?? {};
const updates = Array.isArray(plan.updates) ? plan.updates : [];

if (plan.dryRun || updates.length === 0) {
  export default { executed: false, dryRun: Boolean(plan.dryRun), stopUpdates: [] };
}

const stopUpdates = [];
for (const update of updates) {
  for (const orderId of update.existingStopOrderIds ?? []) {
    await callTool("cancelHyperliquidOrder", { orderId, coin: update.coin });
  }
  const stopResult = await callTool("placeHyperliquidStopOrder", {
    coin: update.coin,
    side: update.side,
    size: String(update.size),
    triggerPrice: String(update.desiredStopPrice),
    triggerType: "stop_loss",
  });
  stopUpdates.push({ coin: update.coin, result: stopResult });
}

export default { executed: true, dryRun: false, stopUpdates };
`
    },
    {
      id: "persist_stop_state",
      type: "ts",
      depends_on: ["apply_stop_updates"],
      code: `
const execution = steps.apply_stop_updates?.result ?? {};
export default {
  persisted: true,
  updateCount: Array.isArray(execution.stopUpdates) ? execution.stopUpdates.length : 0,
};
`
    }
  ]
});
