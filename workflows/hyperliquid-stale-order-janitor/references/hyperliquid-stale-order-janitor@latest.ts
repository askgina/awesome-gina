import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-stale-order-janitor",
  name: "Hyperliquid Stale Order Janitor",
  description:
    "Classify and optionally cancel orphaned, duplicated, or stale Hyperliquid orders that no longer match live exposure.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", default: "" },
    { name: "maxOrderAgeMinutes", type: "number", default: 90 },
    { name: "cancelDuplicateStops", type: "boolean", default: true },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_order_inventory",
      type: "ts",
      allow: ["getHyperliquidPositions", "getHyperliquidOpenOrders", "getHyperliquidPrices"],
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

const positions = toArray(unwrap(positionsRaw)).map((position) => ({
  coin: String(position.coin ?? position.asset ?? "").toUpperCase(),
  side: String(position.side ?? "").toLowerCase(),
  size: Math.abs(toNumber(position.size ?? position.szi ?? 0)),
}));

const openOrders = toArray(unwrap(openOrdersRaw)).map((order) => ({
  orderId: order.orderId ?? order.oid ?? order.id ?? null,
  coin: String(order.coin ?? order.asset ?? "").toUpperCase(),
  side: String(order.side ?? "").toLowerCase(),
  reduceOnly: Boolean(order.reduceOnly ?? false),
  triggerPrice: toNumber(order.triggerPrice ?? order.stopPx ?? 0),
  createdAtMs: toNumber(order.createdAtMs ?? order.timestamp ?? 0),
}));

const pricesPayload = unwrap(pricesRaw);
const prices =
  pricesPayload && typeof pricesPayload === "object" && "prices" in pricesPayload
    ? pricesPayload.prices
    : pricesPayload ?? {};

export default { positions, openOrders, prices, nowMs: Date.now() };
`
    },
    {
      id: "classify_orders",
      type: "ts",
      depends_on: ["fetch_order_inventory"],
      code: `
const state = steps.fetch_order_inventory?.result ?? {};
const maxOrderAgeMinutes = Math.max(Number(inputs.maxOrderAgeMinutes ?? 90), 1);
const cancelDuplicateStops = Boolean(inputs.cancelDuplicateStops ?? true);
const dryRun = Boolean(inputs.dryRun);

const positionsByCoin = new Map(
  (Array.isArray(state.positions) ? state.positions : []).map((position) => [
    position.coin,
    position,
  ]),
);

const seenStopByCoin = new Set();
const cleanupPlan = [];

for (const order of Array.isArray(state.openOrders) ? state.openOrders : []) {
  let reason = "keep";
  if (order.reduceOnly && !positionsByCoin.has(order.coin)) {
    reason = "orphaned_protective_order";
  } else if (
    cancelDuplicateStops &&
    order.reduceOnly &&
    order.triggerPrice > 0 &&
    seenStopByCoin.has(order.coin)
  ) {
    reason = "duplicate_protective_order";
  } else if (
    !order.reduceOnly &&
    state.nowMs > 0 &&
    order.createdAtMs > 0 &&
    state.nowMs - order.createdAtMs > maxOrderAgeMinutes * 60 * 1000
  ) {
    reason = "stale_entry_order";
  }

  if (order.reduceOnly && order.triggerPrice > 0 && !seenStopByCoin.has(order.coin)) {
    seenStopByCoin.add(order.coin);
  }

  if (reason !== "keep") {
    cleanupPlan.push({
      orderId: order.orderId,
      coin: order.coin,
      reason,
    });
  }
}

export default {
  dryRun,
  maxOrderAgeMinutes,
  cleanupPlan,
};
`
    },
    {
      id: "apply_cleanup",
      type: "ts",
      depends_on: ["classify_orders"],
      allow: ["cancelHyperliquidOrder"],
      code: `
const plan = steps.classify_orders?.result ?? {};
const cleanupPlan = Array.isArray(plan.cleanupPlan) ? plan.cleanupPlan : [];

if (plan.dryRun || cleanupPlan.length === 0) {
  export default { executed: false, dryRun: Boolean(plan.dryRun), canceledOrders: [] };
}

const canceledOrders = [];
for (const item of cleanupPlan) {
  const cancelResult = await callTool("cancelHyperliquidOrder", {
    orderId: item.orderId,
    coin: item.coin,
  });
  canceledOrders.push({ ...item, result: cancelResult });
}

export default { executed: true, dryRun: false, canceledOrders };
`
    },
    {
      id: "persist_cleanup_state",
      type: "ts",
      depends_on: ["apply_cleanup"],
      code: `
const execution = steps.apply_cleanup?.result ?? {};
export default {
  persisted: true,
  cleanupCount: Array.isArray(execution.canceledOrders)
    ? execution.canceledOrders.length
    : 0,
};
`
    }
  ]
});
