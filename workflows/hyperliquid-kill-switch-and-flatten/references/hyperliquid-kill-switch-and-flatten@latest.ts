import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-kill-switch-and-flatten",
  name: "Hyperliquid Kill Switch and Flatten",
  description:
    "Cancel open orders and flatten in-scope Hyperliquid positions under an operator-controlled emergency policy.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", default: "" },
    { name: "flattenAll", type: "boolean", default: false },
    { name: "operatorAck", type: "string", default: "" },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_emergency_state",
      type: "ts",
      allow: ["getHyperliquidAccount", "getHyperliquidPositions", "getHyperliquidOpenOrders"],
      code: `
const unwrap = (value) => {
  if (value && typeof value === "object" && "data" in value) return value.data;
  return value;
};
const parseUniverse = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
const [account, positions, openOrders] = await Promise.all([
  callTool("getHyperliquidAccount", {}),
  callTool("getHyperliquidPositions", {}),
  callTool("getHyperliquidOpenOrders", {}),
]);
export default {
  account: unwrap(account),
  positions: unwrap(positions),
  openOrders: unwrap(openOrders),
  allowedCoins: parseUniverse(inputs.coinUniverse),
};
`
    },
    {
      id: "build_flatten_plan",
      type: "ts",
      depends_on: ["fetch_emergency_state"],
      code: `
const state = steps.fetch_emergency_state?.result ?? {};
const operatorAck = String(inputs.operatorAck ?? "").trim();
const dryRun = Boolean(inputs.dryRun);
const flattenAll = Boolean(inputs.flattenAll);
const allowedCoins = Array.isArray(state.allowedCoins) ? state.allowedCoins : [];
const inScope = (coin) => flattenAll || allowedCoins.length === 0 || allowedCoins.includes(coin);

const positions = (Array.isArray(state.positions?.positions) ? state.positions.positions : Array.isArray(state.positions) ? state.positions : [])
  .map((position) => ({
    coin: String(position.coin ?? position.asset ?? "").toUpperCase(),
    side: String(position.side ?? "").toLowerCase().includes("short") ? "short" : "long",
    size: Math.abs(Number(position.size ?? position.szi ?? 0)),
  }))
  .filter((position) => position.coin && position.size > 0 && inScope(position.coin));

const orders = (Array.isArray(state.openOrders?.orders) ? state.openOrders.orders : Array.isArray(state.openOrders) ? state.openOrders : [])
  .map((order) => ({
    orderId: order.orderId ?? order.oid ?? order.id ?? null,
    coin: String(order.coin ?? order.asset ?? "").toUpperCase(),
  }))
  .filter((order) => order.orderId !== null && inScope(order.coin));

export default {
  dryRun,
  flattenAll,
  operatorAckPresent: operatorAck.length > 0,
  orderCancels: orders,
  positionCloses: positions.map((position) => ({
    coin: position.coin,
    side: position.side === "long" ? "sell" : "buy",
    size: Number(position.size.toFixed(6)),
  })),
};
`
    },
    {
      id: "execute_flatten",
      type: "ts",
      depends_on: ["build_flatten_plan"],
      allow: ["cancelHyperliquidOrder", "placeHyperliquidOrder"],
      code: `
const plan = steps.build_flatten_plan?.result ?? {};
if (
  plan.dryRun ||
  !plan.operatorAckPresent ||
  ((plan.orderCancels?.length ?? 0) === 0 && (plan.positionCloses?.length ?? 0) === 0)
) {
  export default {
    executed: false,
    dryRun: Boolean(plan.dryRun),
    canceledOrders: [],
    flattenedPositions: [],
  };
}

const canceledOrders = [];
for (const order of plan.orderCancels ?? []) {
  const result = await callTool("cancelHyperliquidOrder", {
    orderId: order.orderId,
    coin: order.coin,
  });
  canceledOrders.push({ ...order, result });
}

const flattenedPositions = [];
for (const position of plan.positionCloses ?? []) {
  const result = await callTool("placeHyperliquidOrder", {
    coin: position.coin,
    side: position.side,
    orderType: "market",
    size: String(position.size),
    reduceOnly: true,
    slippage: 0.05,
  });
  flattenedPositions.push({ ...position, result });
}

export default { executed: true, dryRun: false, canceledOrders, flattenedPositions };
`
    },
    {
      id: "persist_kill_switch_state",
      type: "ts",
      depends_on: ["execute_flatten"],
      code: `
const execution = steps.execute_flatten?.result ?? {};
export default {
  persisted: true,
  summary: {
    canceledCount: Array.isArray(execution.canceledOrders) ? execution.canceledOrders.length : 0,
    flattenedCount: Array.isArray(execution.flattenedPositions)
      ? execution.flattenedPositions.length
      : 0,
  },
};
`
    }
  ]
});
