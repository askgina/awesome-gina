import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-portfolio-rebalance-executor",
  name: "Hyperliquid Portfolio Rebalance Executor",
  description:
    "Build and optionally execute bounded leverage and concentration trims for a Hyperliquid portfolio.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "riskProfile", type: "string", default: "BALANCED" },
    { name: "coinUniverse", type: "string", default: "" },
    { name: "maxTrimPctPerRun", type: "number", default: 0.2 },
    { name: "maxOrders", type: "number", default: 4 },
    { name: "dryRun", type: "boolean", default: true }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_portfolio_state",
      type: "ts",
      allow: [
        "getHyperliquidAccount",
        "getHyperliquidPortfolio",
        "getHyperliquidPositions",
        "getHyperliquidOpenOrders",
        "getHyperliquidPrices"
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
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.orders)) return value.orders;
  return [];
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const [accountRaw, portfolioRaw, positionsRaw, openOrdersRaw, pricesRaw] =
  await Promise.all([
    callTool("getHyperliquidAccount", {}),
    callTool("getHyperliquidPortfolio", {}),
    callTool("getHyperliquidPositions", {}),
    callTool("getHyperliquidOpenOrders", {}),
    callTool("getHyperliquidPrices", {
      coins: parseUniverse(inputs.coinUniverse),
    }),
  ]);

const account = unwrap(accountRaw) ?? {};
const portfolio = unwrap(portfolioRaw) ?? {};
const positions = toArray(unwrap(positionsRaw))
  .map((position) => {
    const coin = String(position.coin ?? position.asset ?? position.symbol ?? "")
      .toUpperCase();
    const sideRaw = String(position.side ?? position.direction ?? "").toLowerCase();
    const side = sideRaw.includes("short") ? "short" : "long";
    const size = Math.abs(
      toNumber(position.size ?? position.szi ?? position.positionSize ?? 0),
    );
    const entryPrice = toNumber(
      position.entryPrice ?? position.entryPx ?? position.avgEntry ?? 0,
    );
    const markPrice = toNumber(
      position.markPrice ?? position.markPx ?? position.midPx ?? entryPrice,
      entryPrice,
    );
    const notionalUsd = Math.abs(
      toNumber(position.notionalUsd ?? position.positionValue ?? size * markPrice),
    );
    return {
      coin,
      side,
      size,
      entryPrice,
      markPrice,
      notionalUsd,
    };
  })
  .filter((position) => position.coin && position.size > 0 && position.notionalUsd > 0);

const openOrders = toArray(unwrap(openOrdersRaw)).map((order) => ({
  orderId: order.orderId ?? order.oid ?? order.id ?? null,
  coin: String(order.coin ?? order.asset ?? order.symbol ?? "").toUpperCase(),
  reduceOnly: Boolean(order.reduceOnly ?? order.reduce_only ?? false),
  side: String(order.side ?? "").toLowerCase(),
}));

const pricesPayload = unwrap(pricesRaw);
const prices =
  pricesPayload && typeof pricesPayload === "object" && "prices" in pricesPayload
    ? pricesPayload.prices
    : pricesPayload ?? {};

const accountValue = Math.max(
  toNumber(account.accountValue ?? portfolio.accountValue ?? portfolio.totalValue ?? 0),
  1,
);
const grossNotionalUsd = positions.reduce(
  (total, position) => total + position.notionalUsd,
  0,
);

export default {
  accountValue,
  grossNotionalUsd,
  grossLeverage:
    toNumber(portfolio.grossLeverage, 0) || grossNotionalUsd / accountValue,
  account,
  portfolio,
  positions,
  openOrders,
  prices,
};
`
    },
    {
      id: "plan_rebalance",
      type: "ts",
      depends_on: ["fetch_portfolio_state"],
      code: `
const state = steps.fetch_portfolio_state?.result ?? {};
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseUniverse = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const profiles = {
  DEFENSIVE: { maxGrossLeverage: 1.8, maxConcentration: 0.22, minTrimFloor: 0.08 },
  BALANCED: { maxGrossLeverage: 2.5, maxConcentration: 0.33, minTrimFloor: 0.06 },
  AGGRESSIVE: { maxGrossLeverage: 4.0, maxConcentration: 0.45, minTrimFloor: 0.04 },
};

const riskProfile = String(inputs.riskProfile ?? "BALANCED").toUpperCase();
const profile = profiles[riskProfile] ?? profiles.BALANCED;
const accountValue = Math.max(toNumber(state.accountValue, 1), 1);
const grossNotionalUsd = Math.max(toNumber(state.grossNotionalUsd, 0), 0);
const grossLeverage = toNumber(state.grossLeverage, grossNotionalUsd / accountValue);
const maxTrimPctPerRun = Math.min(
  Math.max(toNumber(inputs.maxTrimPctPerRun, 0.2), 0.01),
  1,
);
const maxOrders = Math.max(Math.floor(toNumber(inputs.maxOrders, 4)), 1);
const dryRun = Boolean(inputs.dryRun);
const allowedCoins = parseUniverse(inputs.coinUniverse);

const scopedPositions = (Array.isArray(state.positions) ? state.positions : []).filter(
  (position) => allowedCoins.length === 0 || allowedCoins.includes(position.coin),
);

const leverageOvershoot = Math.max(0, grossLeverage - profile.maxGrossLeverage);

const actions = scopedPositions
  .map((position) => {
    const concentration =
      grossNotionalUsd > 0 ? position.notionalUsd / grossNotionalUsd : 0;
    const concentrationOvershoot = Math.max(
      0,
      concentration - profile.maxConcentration,
    );
    const trimPct = Math.min(
      maxTrimPctPerRun,
      Math.max(
        profile.minTrimFloor,
        concentrationOvershoot * 1.5 + leverageOvershoot * 0.25,
      ),
    );

    if (concentrationOvershoot <= 0 && leverageOvershoot <= 0) {
      return null;
    }

    return {
      coin: position.coin,
      reason:
        concentrationOvershoot > leverageOvershoot
          ? "concentration_trim"
          : "gross_leverage_trim",
      side: position.side === "long" ? "sell" : "buy",
      reduceOnly: true,
      concentration: Number(concentration.toFixed(4)),
      trimPct: Number(trimPct.toFixed(4)),
      trimSize: Number((position.size * trimPct).toFixed(6)),
      notionalUsd: position.notionalUsd,
      cancelOrderIds: (Array.isArray(state.openOrders) ? state.openOrders : [])
        .filter(
          (order) =>
            order.coin === position.coin &&
            !order.reduceOnly &&
            order.orderId !== null,
        )
        .map((order) => order.orderId)
        .slice(0, 5),
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.notionalUsd - a.notionalUsd)
  .slice(0, maxOrders);

export default {
  dryRun,
  riskProfile,
  limits: profile,
  accountValue,
  grossNotionalUsd,
  grossLeverage: Number(grossLeverage.toFixed(4)),
  selectedPositions: scopedPositions.map((position) => position.coin),
  actionCount: actions.length,
  actions,
};
`
    },
    {
      id: "execute_rebalance",
      type: "ts",
      depends_on: ["plan_rebalance"],
      allow: ["cancelHyperliquidOrder", "placeHyperliquidOrder"],
      code: `
const plan = steps.plan_rebalance?.result ?? {};
const actions = Array.isArray(plan.actions) ? plan.actions : [];

if (plan.dryRun || actions.length === 0) {
  export default {
    executed: false,
    dryRun: Boolean(plan.dryRun),
    submittedOrders: [],
    canceledOrders: [],
  };
}

const canceledOrders = [];
const submittedOrders = [];

for (const action of actions) {
  for (const orderId of action.cancelOrderIds ?? []) {
    const cancelResult = await callTool("cancelHyperliquidOrder", {
      orderId,
      coin: action.coin,
    });
    canceledOrders.push({ coin: action.coin, orderId, result: cancelResult });
  }

  const orderResult = await callTool("placeHyperliquidOrder", {
    coin: action.coin,
    side: action.side,
    orderType: "market",
    size: String(action.trimSize),
    reduceOnly: true,
    slippage: 0.03,
  });
  submittedOrders.push({ coin: action.coin, result: orderResult });
}

export default {
  executed: true,
  dryRun: false,
  submittedOrders,
  canceledOrders,
};
`
    },
    {
      id: "persist_rebalance_state",
      type: "ts",
      depends_on: ["execute_rebalance"],
      code: `
const execution = steps.execute_rebalance?.result ?? {};
export default {
  persisted: true,
  rebalanceSummary: {
    executed: Boolean(execution.executed),
    canceledCount: Array.isArray(execution.canceledOrders)
      ? execution.canceledOrders.length
      : 0,
    orderCount: Array.isArray(execution.submittedOrders)
      ? execution.submittedOrders.length
      : 0,
  },
};
`
    }
  ]
});
