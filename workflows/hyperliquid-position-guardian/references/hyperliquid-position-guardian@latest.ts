import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-position-guardian",
  name: "Hyperliquid Position Guardian",
  description:
    "Monitor live Hyperliquid positions for liquidation, spread, and stop-health breaches and optionally reduce risk.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", default: "" },
    { name: "minLiquidationBufferPct", type: "number", default: 0.08 },
    { name: "maxSpreadPct", type: "number", default: 0.006 },
    { name: "maxReductionPct", type: "number", default: 0.5 },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_live_state",
      type: "ts",
      allow: [
        "getHyperliquidAccount",
        "getHyperliquidPositions",
        "getHyperliquidOpenOrders",
        "getHyperliquidPrices",
        "fetchHyperliquidOrderBook"
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

const [accountRaw, positionsRaw, openOrdersRaw, pricesRaw] = await Promise.all([
  callTool("getHyperliquidAccount", {}),
  callTool("getHyperliquidPositions", {}),
  callTool("getHyperliquidOpenOrders", {}),
  callTool("getHyperliquidPrices", { coins: parseUniverse(inputs.coinUniverse) }),
]);

const positions = toArray(unwrap(positionsRaw))
  .map((position) => ({
    coin: String(position.coin ?? position.asset ?? "").toUpperCase(),
    side: String(position.side ?? "").toLowerCase().includes("short") ? "short" : "long",
    size: Math.abs(toNumber(position.size ?? position.szi ?? 0)),
    markPrice: toNumber(position.markPrice ?? position.markPx ?? 0),
    liquidationPrice: toNumber(
      position.liquidationPrice ?? position.liqPrice ?? position.liquidationPx ?? 0,
    ),
    entryPrice: toNumber(position.entryPrice ?? position.entryPx ?? 0),
  }))
  .filter((position) => position.coin && position.size > 0 && position.markPrice > 0);

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

const orderBooks = {};
for (const position of positions) {
  orderBooks[position.coin] = await callTool("fetchHyperliquidOrderBook", {
    coin: position.coin,
    depth: 5,
  });
}

export default {
  account: unwrap(accountRaw) ?? {},
  positions,
  openOrders,
  prices,
  orderBooks,
};
`
    },
    {
      id: "evaluate_guardrails",
      type: "ts",
      depends_on: ["fetch_live_state"],
      code: `
const state = steps.fetch_live_state?.result ?? {};
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const minLiquidationBufferPct = Math.max(toNumber(inputs.minLiquidationBufferPct, 0.08), 0.01);
const maxSpreadPct = Math.max(toNumber(inputs.maxSpreadPct, 0.006), 0.001);
const maxReductionPct = Math.min(Math.max(toNumber(inputs.maxReductionPct, 0.5), 0.05), 1);
const dryRun = Boolean(inputs.dryRun);

const stopOrdersForCoin = (coin) =>
  (Array.isArray(state.openOrders) ? state.openOrders : []).filter(
    (order) => order.coin === coin && order.reduceOnly && toNumber(order.triggerPrice, 0) > 0,
  );

const actions = [];

for (const position of Array.isArray(state.positions) ? state.positions : []) {
  const orderBook = state.orderBooks?.[position.coin] ?? {};
  const bids = Array.isArray(orderBook.bids) ? orderBook.bids : [];
  const asks = Array.isArray(orderBook.asks) ? orderBook.asks : [];
  const bestBid = toNumber(bids[0]?.price, position.markPrice);
  const bestAsk = toNumber(asks[0]?.price, position.markPrice);
  const spreadPct =
    bestAsk > 0 ? Math.max(0, (bestAsk - bestBid) / bestAsk) : 0;
  const liquidationBufferPct =
    position.liquidationPrice > 0
      ? position.side === "long"
        ? (position.markPrice - position.liquidationPrice) / position.markPrice
        : (position.liquidationPrice - position.markPrice) / position.markPrice
      : 1;
  const hasStop = stopOrdersForCoin(position.coin).length > 0;

  let actionType = "hold";
  if (!hasStop) {
    actionType = "repair-stop";
  }
  if (spreadPct > maxSpreadPct || liquidationBufferPct < minLiquidationBufferPct) {
    actionType =
      liquidationBufferPct < minLiquidationBufferPct / 2 ? "flatten" : "reduce";
  }

  if (actionType === "hold") continue;

  const stopSize = Number(position.size.toFixed(6));
  const reductionSize =
    actionType === "flatten"
      ? stopSize
      : Number((position.size * Math.min(maxReductionPct, 0.35)).toFixed(6));

  actions.push({
    coin: position.coin,
    actionType,
    side: position.side === "long" ? "sell" : "buy",
    reduceOnly: true,
    spreadPct: Number(spreadPct.toFixed(4)),
    liquidationBufferPct: Number(liquidationBufferPct.toFixed(4)),
    stopSize,
    reduceSize: reductionSize,
    desiredStopPrice:
      position.side === "long"
        ? Number((position.markPrice * (1 - minLiquidationBufferPct)).toFixed(2))
        : Number((position.markPrice * (1 + minLiquidationBufferPct)).toFixed(2)),
    existingStopOrderIds: stopOrdersForCoin(position.coin).map((order) => order.orderId),
  });
}

export default {
  dryRun,
  thresholds: {
    minLiquidationBufferPct,
    maxSpreadPct,
    maxReductionPct,
  },
  actionCount: actions.length,
  actions,
};
`
    },
    {
      id: "execute_remediation",
      type: "ts",
      depends_on: ["evaluate_guardrails"],
      allow: ["cancelHyperliquidOrder", "placeHyperliquidOrder", "placeHyperliquidStopOrder"],
      code: `
const plan = steps.evaluate_guardrails?.result ?? {};
const actions = Array.isArray(plan.actions) ? plan.actions : [];

if (plan.dryRun || actions.length === 0) {
  export default { executed: false, dryRun: Boolean(plan.dryRun), actions: [] };
}

const executed = [];
for (const action of actions) {
  if (action.actionType === "repair-stop") {
    for (const orderId of action.existingStopOrderIds ?? []) {
      await callTool("cancelHyperliquidOrder", { orderId, coin: action.coin });
    }
    const stopResult = await callTool("placeHyperliquidStopOrder", {
      coin: action.coin,
      side: action.side,
      size: String(action.stopSize ?? action.reduceSize),
      triggerPrice: String(action.desiredStopPrice),
      triggerType: "stop_loss",
    });
    executed.push({ coin: action.coin, actionType: action.actionType, result: stopResult });
    continue;
  }

  const orderResult = await callTool("placeHyperliquidOrder", {
    coin: action.coin,
    side: action.side,
    orderType: "market",
    size: String(action.reduceSize),
    reduceOnly: true,
    slippage: 0.03,
  });
  executed.push({ coin: action.coin, actionType: action.actionType, result: orderResult });
}

export default { executed: true, dryRun: false, actions: executed };
`
    },
    {
      id: "persist_guard_state",
      type: "ts",
      depends_on: ["execute_remediation"],
      code: `
const execution = steps.execute_remediation?.result ?? {};
export default {
  persisted: true,
  executionSummary: {
    executed: Boolean(execution.executed),
    actionCount: Array.isArray(execution.actions) ? execution.actions.length : 0,
  },
};
`
    }
  ]
});
