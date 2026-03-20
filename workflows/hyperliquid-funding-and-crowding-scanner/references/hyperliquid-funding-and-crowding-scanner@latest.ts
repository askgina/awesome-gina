import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-funding-and-crowding-scanner",
  name: "Hyperliquid Funding and Crowding Scanner",
  description:
    "Read Hyperliquid market context and rank symbols for crowding, spread, and funding-pressure review.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "coinUniverse", type: "string", default: "" },
    { name: "topN", type: "number", default: 10 },
    { name: "maxSpreadPct", type: "number", default: 0.008 },
    { name: "snapshotPrefix", type: "string", default: "hyperliquid-funding-crowding:" }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_market_context",
      type: "ts",
      allow: [
        "getHyperliquidAssetData",
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
const universe = parseUniverse(inputs.coinUniverse);
const positions = unwrap(await callTool("getHyperliquidPositions", {}));
const openOrders = unwrap(await callTool("getHyperliquidOpenOrders", {}));
const prices = unwrap(await callTool("getHyperliquidPrices", { coins: universe }));
const markets = [];
for (const coin of universe) {
  const [assetData, orderBook] = await Promise.all([
    callTool("getHyperliquidAssetData", { coin }),
    callTool("fetchHyperliquidOrderBook", { coin, depth: 10 }),
  ]);
  markets.push({
    coin,
    assetData: unwrap(assetData),
    orderBook: unwrap(orderBook),
  });
}
export default { universe, positions, openOrders, prices, markets };
`
    },
    {
      id: "score_crowding",
      type: "ts",
      depends_on: ["fetch_market_context"],
      code: `
const state = steps.fetch_market_context?.result ?? {};
const topN = Math.max(Math.floor(Number(inputs.topN ?? 10)), 1);
const maxSpreadPct = Math.max(Number(inputs.maxSpreadPct ?? 0.008), 0.001);
const positionCoins = new Set(
  (Array.isArray(state.positions?.positions) ? state.positions.positions : Array.isArray(state.positions) ? state.positions : [])
    .map((position) => String(position.coin ?? position.asset ?? "").toUpperCase()),
);

const watchlist = (Array.isArray(state.markets) ? state.markets : [])
  .map((market) => {
    const bids = Array.isArray(market.orderBook?.bids) ? market.orderBook.bids : [];
    const asks = Array.isArray(market.orderBook?.asks) ? market.orderBook.asks : [];
    const bestBid = Number(bids[0]?.price ?? 0);
    const bestAsk = Number(asks[0]?.price ?? 0);
    const spreadPct = bestAsk > 0 ? Math.max(0, (bestAsk - bestBid) / bestAsk) : 0;
    const fundingRate = Number(
      market.assetData?.fundingRate ??
        market.assetData?.funding ??
        market.assetData?.carryRate ??
        0,
    );
    const leverage = Number(market.assetData?.leverage ?? 0);
    const score =
      Math.abs(fundingRate) * 1000 +
      spreadPct * 200 +
      (spreadPct > maxSpreadPct ? 15 : 0) +
      leverage;
    return {
      coin: market.coin,
      fundingRate: Number(fundingRate.toFixed(6)),
      spreadPct: Number(spreadPct.toFixed(4)),
      leverage,
      heldPosition: positionCoins.has(market.coin),
      score: Number(score.toFixed(2)),
      crowdingBias:
        fundingRate > 0 ? "crowded_longs" : fundingRate < 0 ? "crowded_shorts" : "neutral",
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, topN);

export default {
  topN,
  maxSpreadPct,
  snapshotPrefix: String(inputs.snapshotPrefix ?? "hyperliquid-funding-crowding:"),
  watchlist,
};
`
    },
    {
      id: "emit_scan_artifacts",
      type: "ts",
      depends_on: ["score_crowding"],
      code: `
const result = steps.score_crowding?.result ?? {};
export default {
  wroteArtifacts: true,
  shortlistCount: Array.isArray(result.watchlist) ? result.watchlist.length : 0,
  summary:
    Array.isArray(result.watchlist) && result.watchlist.length > 0
      ? result.watchlist[0].coin + " ranked highest for crowding review"
      : "No ranked crowding candidates",
};
`
    }
  ]
});
