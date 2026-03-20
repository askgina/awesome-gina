import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-multi-asset-trend-basket",
  name: "Hyperliquid Multi Asset Trend Basket",
  description:
    "Scan a configured universe, rank trend-aligned candidates, and optionally execute a bounded Hyperliquid basket.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", required: true },
    { name: "interval", type: "string", default: "4h" },
    { name: "maxPositions", type: "number", default: 3 },
    { name: "riskPctPerPosition", type: "number", default: 0.0075 },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "scan_universe",
      type: "ts",
      allow: [
        "getHyperliquidAccount",
        "getHyperliquidPositions",
        "getHyperliquidOpenOrders",
        "getHyperliquidPrices",
        "fetchHyperliquidCandles",
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
const universe = parseUniverse(inputs.coinUniverse);
const [account, positions, openOrders, prices] = await Promise.all([
  callTool("getHyperliquidAccount", {}),
  callTool("getHyperliquidPositions", {}),
  callTool("getHyperliquidOpenOrders", {}),
  callTool("getHyperliquidPrices", { coins: universe }),
]);
const marketContext = [];
for (const coin of universe) {
  const [candles, orderBook] = await Promise.all([
    callTool("fetchHyperliquidCandles", { coin, interval: String(inputs.interval ?? "4h") }),
    callTool("fetchHyperliquidOrderBook", { coin, depth: 5 }),
  ]);
  marketContext.push({ coin, candles: unwrap(candles), orderBook: unwrap(orderBook) });
}
export default {
  account: unwrap(account),
  positions: unwrap(positions),
  openOrders: unwrap(openOrders),
  prices: unwrap(prices),
  universe,
  marketContext,
};
`
    },
    {
      id: "select_basket",
      type: "ts",
      depends_on: ["scan_universe"],
      code: `
const state = steps.scan_universe?.result ?? {};
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const accountValue = Math.max(
  toNumber(state.account?.accountValue ?? state.account?.balance ?? 0),
  1,
);
const maxPositions = Math.max(Math.floor(toNumber(inputs.maxPositions, 3)), 1);
const riskPctPerPosition = Math.max(toNumber(inputs.riskPctPerPosition, 0.0075), 0.001);
const dryRun = Boolean(inputs.dryRun);
const livePrices =
  state.prices && typeof state.prices === "object" && "prices" in state.prices
    ? state.prices.prices
    : state.prices ?? {};
const existingPositions = Array.isArray(state.positions?.positions)
  ? state.positions.positions
  : Array.isArray(state.positions)
    ? state.positions
    : [];

const ranked = (Array.isArray(state.marketContext) ? state.marketContext : [])
  .map((item) => {
    const candles = Array.isArray(item.candles) ? item.candles : [];
    const closes = candles.map((candle) => toNumber(candle.close, 0)).filter((value) => value > 0);
    const lastClose = closes.at(-1) ?? 0;
    const referencePrice = toNumber(livePrices?.[item.coin], lastClose);
    const avgClose =
      closes.length > 0
        ? closes.reduce((total, value) => total + value, 0) / closes.length
        : 0;
    const momentum = avgClose > 0 ? (lastClose - avgClose) / avgClose : 0;
    const side = momentum >= 0 ? "buy" : "sell";
    const orderBook = item.orderBook ?? {};
    const bids = Array.isArray(orderBook.bids) ? orderBook.bids : [];
    const asks = Array.isArray(orderBook.asks) ? orderBook.asks : [];
    const bestBid = toNumber(bids[0]?.price, referencePrice);
    const bestAsk = toNumber(asks[0]?.price, referencePrice);
    const spreadPct = bestAsk > 0 ? Math.max(0, (bestAsk - bestBid) / bestAsk) : 0;
    const desiredNotionalUsd = accountValue * riskPctPerPosition;
    const size = referencePrice > 0 ? desiredNotionalUsd / referencePrice : 0;
    const existing = existingPositions.find(
      (position) => String(position.coin ?? position.asset ?? "").toUpperCase() === item.coin,
    );
    return {
      coin: item.coin,
      side,
      momentum: Number(momentum.toFixed(4)),
      spreadPct: Number(spreadPct.toFixed(4)),
      size: Number(size.toFixed(6)),
      referencePrice: Number(referencePrice.toFixed(6)),
      flipRequired:
        existing &&
        String(existing.side ?? "").toLowerCase().includes(side === "buy" ? "short" : "long"),
    };
  })
  .sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum))
  .slice(0, maxPositions);

export default {
  dryRun,
  interval: String(inputs.interval ?? "4h"),
  maxPositions,
  riskPctPerPosition,
  basketPlan: ranked,
};
`
    },
    {
      id: "execute_basket",
      type: "ts",
      depends_on: ["select_basket"],
      allow: ["cancelHyperliquidOrder", "placeHyperliquidOrder", "placeHyperliquidStopOrder"],
      code: `
const plan = steps.select_basket?.result ?? {};
const basketPlan = Array.isArray(plan.basketPlan) ? plan.basketPlan : [];

if (plan.dryRun || basketPlan.length === 0) {
  export default { executed: false, dryRun: Boolean(plan.dryRun), basketOrders: [] };
}

const basketOrders = [];
for (const item of basketPlan) {
  const stopTriggerPrice = Number(
    (Number(item.referencePrice ?? 0) * (item.side === "buy" ? 0.97 : 1.03)).toFixed(4),
  );
  const entryResult = await callTool("placeHyperliquidOrder", {
    coin: item.coin,
    side: item.side,
    orderType: "market",
    size: String(item.size),
    reduceOnly: false,
    slippage: 0.04,
  });
  const stopSide = item.side === "buy" ? "sell" : "buy";
  const stopResult = await callTool("placeHyperliquidStopOrder", {
    coin: item.coin,
    side: stopSide,
    size: String(item.size),
    triggerPrice: String(stopTriggerPrice),
    triggerType: "stop_loss",
  });
  basketOrders.push({ coin: item.coin, entryResult, stopResult });
}

export default { executed: true, dryRun: false, basketOrders };
`
    },
    {
      id: "persist_basket_state",
      type: "ts",
      depends_on: ["execute_basket"],
      code: `
const execution = steps.execute_basket?.result ?? {};
export default {
  persisted: true,
  basketOrderCount: Array.isArray(execution.basketOrders) ? execution.basketOrders.length : 0,
};
`
    }
  ]
});
