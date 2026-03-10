import defineWorkflow from "/workspace/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "hyperliquid-portfolio-risk-calibrator",
  name: "Hyperliquid Portfolio Risk Calibrator",
  description:
    "Reads Hyperliquid account state and produces portfolio-level risk calibration targets (profile, leverage cap, per-position risk budgets, and rebalance guidance).",
  triggers: [{ manual: true }],
  inputs: [
    { name: "riskProfile", type: "string", default: "BALANCED" },
    { name: "coinUniverse", type: "string", default: "" },
    { name: "profileOverrideJson", type: "string", default: "" }
  ],
  output_mode: "inline",
  steps: [
    {
      id: "fetch_portfolio_state",
      name: "Fetch Hyperliquid Portfolio State",
      type: "ts",
      allow: [
        "getHyperliquidAccount",
        "getHyperliquidPortfolio",
        "getHyperliquidPositions",
        "getHyperliquidOpenOrders",
        "getHyperliquidPrices",
        "fetchHyperliquidCandles"
      ],
      code: `
const unwrap = (v) => (v && typeof v === "object" && "data" in v ? v.data : v);
const toNum = (v, fallback = NaN) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};
const toRows = async (payload) => {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.candles)) return data.candles;
  if (Array.isArray(data?.rows)) return data.rows;
  if (data && data.sql_required && data.table) {
    const table = String(data.table).replace(/"/g, "");
    return await sql('SELECT * FROM "' + table + '" ORDER BY CAST(timestamp AS REAL) ASC');
  }
  return [];
};
const iso = (ms) => new Date(ms).toISOString();
const parseProfile = () => {
  const key = String(inputs.riskProfile ?? "BALANCED").trim().toUpperCase();
  const profiles = {
    DEFENSIVE: { vpvrLookbackDays: 21 },
    BALANCED: { vpvrLookbackDays: 14 },
    AGGRESSIVE: { vpvrLookbackDays: 10 }
  };
  return { key: profiles[key] ? key : "BALANCED", profiles };
};

let output;
try {
  const [accountRaw, portfolioRaw, positionsRaw, openOrdersRaw] = await Promise.all([
    callTool("getHyperliquidAccount", {}),
    callTool("getHyperliquidPortfolio", {}),
    callTool("getHyperliquidPositions", {}),
    callTool("getHyperliquidOpenOrders", {})
  ]);

  const account = unwrap(accountRaw) ?? {};
  const portfolio = unwrap(portfolioRaw) ?? {};
  const positionsBlob = unwrap(positionsRaw) ?? {};
  const openOrdersBlob = unwrap(openOrdersRaw) ?? {};
  const positionsList = Array.isArray(positionsBlob?.positions)
    ? positionsBlob.positions
    : Array.isArray(positionsBlob)
      ? positionsBlob
      : [];

  const explicitUniverse = String(inputs.coinUniverse ?? "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  const portfolioUniverse = Array.from(
    new Set(
      positionsList
        .map((p) => String(p?.coin ?? p?.asset ?? p?.symbol ?? "").toUpperCase())
        .filter(Boolean)
    )
  );

  const universe = explicitUniverse.length > 0 ? explicitUniverse : portfolioUniverse;

  let prices = {};
  let candlesByCoin = {};
  if (universe.length > 0) {
    const pricesRaw = await callTool("getHyperliquidPrices", { assets: universe });
    prices = unwrap(pricesRaw) ?? {};

    const profileCtx = parseProfile();
    const lookbackDays = profileCtx.profiles[profileCtx.key].vpvrLookbackDays;
    const now = Date.now();
    const candleRawList = await Promise.all(
      universe.map((coin) =>
        callTool("fetchHyperliquidCandles", {
          coin,
          interval: "1h",
          startTime: { iso: iso(now - lookbackDays * 24 * 60 * 60 * 1000) },
          endTime: { iso: iso(now) }
        })
      )
    );
    const pairs = await Promise.all(
      candleRawList.map(async (raw, i) => [universe[i], await toRows(raw)])
    );
    candlesByCoin = Object.fromEntries(pairs);
  }

  output = {
    ok: true,
    fetchedAt: Date.now(),
    account,
    portfolio,
    prices,
    candlesByCoin,
    universe,
    positions: positionsList,
    openOrders: Array.isArray(openOrdersBlob?.orders)
      ? openOrdersBlob.orders
      : Array.isArray(openOrdersBlob)
        ? openOrdersBlob
        : [],
    accountValue:
      toNum(account?.accountValue, NaN) ||
      toNum(portfolio?.accountValue, NaN) ||
      toNum(portfolio?.summary?.accountValue, NaN),
    dayPnlPct:
      toNum(portfolio?.dayPnlPercent, NaN) ||
      toNum(portfolio?.summary?.day?.roe, NaN)
  };
} catch (error) {
  output = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    fetchedAt: Date.now(),
    positions: [],
    openOrders: []
  };
}

export default output;
`
    },
    {
      id: "calibrate_risk",
      name: "Calibrate Portfolio Risk Targets",
      type: "ts",
      depends_on: ["fetch_portfolio_state"],
      code: `
const raw = steps.fetch_portfolio_state?.result;
const state = raw?.result ?? raw ?? {};

const toNum = (v, fallback = NaN) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const abs = (v) => Math.abs(toNum(v, 0));
const loadProfile = () => {
  const profileKeyRaw = String(inputs.riskProfile ?? "BALANCED").trim().toUpperCase();
  const baseProfiles = {
    DEFENSIVE: {
      riskBudgetPct: 0.01,
      stopLossPct: 0.02,
      maxGrossLeverage: 2.5,
      warnConcentrationPct: 0.3,
      vpvrLookbackDays: 21,
      vpvrBins: 32,
      longSupportBoost: 1.05,
      longBelowPocPenalty: 0.8,
      shortIntoSupportPenalty: 0.55,
      shortAtResistanceBoost: 1.1,
      uptrendShortPenalty: 0.75,
      downtrendLongPenalty: 0.8
    },
    BALANCED: {
      riskBudgetPct: 0.015,
      stopLossPct: 0.02,
      maxGrossLeverage: 3.5,
      warnConcentrationPct: 0.4,
      vpvrLookbackDays: 14,
      vpvrBins: 24,
      longSupportBoost: 1.1,
      longBelowPocPenalty: 0.9,
      shortIntoSupportPenalty: 0.7,
      shortAtResistanceBoost: 1.15,
      uptrendShortPenalty: 0.85,
      downtrendLongPenalty: 0.9
    },
    AGGRESSIVE: {
      riskBudgetPct: 0.025,
      stopLossPct: 0.025,
      maxGrossLeverage: 5,
      warnConcentrationPct: 0.5,
      vpvrLookbackDays: 10,
      vpvrBins: 20,
      longSupportBoost: 1.2,
      longBelowPocPenalty: 0.95,
      shortIntoSupportPenalty: 0.8,
      shortAtResistanceBoost: 1.2,
      uptrendShortPenalty: 0.9,
      downtrendLongPenalty: 0.95
    }
  };
  const profileKey = baseProfiles[profileKeyRaw] ? profileKeyRaw : "BALANCED";
  let merged = { ...baseProfiles[profileKey] };
  const rawOverride = String(inputs.profileOverrideJson ?? "").trim();
  if (rawOverride) {
    try {
      const parsed = JSON.parse(rawOverride);
      if (parsed && typeof parsed === "object") merged = { ...merged, ...parsed };
    } catch (_e) {}
  }
  return { profileKey, config: merged };
};
const vpvrScore = (candles, markPx, binsInput) => {
  const bins = Math.max(8, Math.min(80, Math.floor(toNum(binsInput, 24))));
  if (!Array.isArray(candles) || candles.length < 20 || !Number.isFinite(markPx) || markPx <= 0) {
    return { score: 1, pocPx: markPx, valueAreaPct: 0, distanceFromPocPct: 0 };
  }
  const lows = candles.map((c) => toNum(c?.low, NaN)).filter(Number.isFinite);
  const highs = candles.map((c) => toNum(c?.high, NaN)).filter(Number.isFinite);
  if (lows.length === 0 || highs.length === 0) {
    return { score: 1, pocPx: markPx, valueAreaPct: 0, distanceFromPocPct: 0 };
  }
  const minPx = Math.min(...lows);
  const maxPx = Math.max(...highs);
  const range = maxPx - minPx;
  if (!Number.isFinite(range) || range <= 0) {
    return { score: 1, pocPx: markPx, valueAreaPct: 0, distanceFromPocPct: 0 };
  }
  const step = range / bins;
  const hist = Array.from({ length: bins }, () => 0);

  for (const c of candles) {
    const low = toNum(c?.low, NaN);
    const high = toNum(c?.high, NaN);
    const close = toNum(c?.close, NaN);
    const vol = Math.max(0, toNum(c?.volume, 0));
    if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(close) || vol <= 0) continue;
    const px = Math.min(high, Math.max(low, close));
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((px - minPx) / step)));
    hist[idx] += vol;
  }

  const totalVol = hist.reduce((a, b) => a + b, 0);
  const maxVol = Math.max(...hist, 0);
  if (totalVol <= 0 || maxVol <= 0) {
    return { score: 1, pocPx: markPx, valueAreaPct: 0, distanceFromPocPct: 0 };
  }

  const pocIdx = hist.findIndex((v) => v === maxVol);
  const pocPx = minPx + (pocIdx + 0.5) * step;
  const markIdx = Math.max(0, Math.min(bins - 1, Math.floor((markPx - minPx) / step)));
  const localDensity = hist[markIdx] / maxVol;
  const distanceFromPocPct = abs(markPx - pocPx) / markPx;

  const sorted = [...hist].sort((a, b) => b - a);
  let cum = 0;
  let used = 0;
  for (const v of sorted) {
    cum += v;
    used += 1;
    if (cum / totalVol >= 0.7) break;
  }
  const valueAreaPct = used / bins;

  const distancePenalty = 1 / (1 + distanceFromPocPct * 25);
  const raw = 0.6 * localDensity + 0.4 * distancePenalty;
  const score = clamp(raw, 0.35, 1.8);
  const firstClose = toNum(candles[0]?.close, NaN);
  const lastClose = toNum(candles[candles.length - 1]?.close, NaN);
  const trendPct = Number.isFinite(firstClose) && firstClose > 0 && Number.isFinite(lastClose)
    ? (lastClose - firstClose) / firstClose
    : 0;
  return { score, pocPx, valueAreaPct, distanceFromPocPct, trendPct };
};

let result;
if (!state?.ok) {
  result = {
    ok: false,
    action: "NOOP",
    reason: "state_unavailable",
    error: state?.error ?? "unable_to_fetch_hyperliquid_state"
  };
} else {
  const profileCtx = loadProfile();
  const riskBudgetPct = clamp(toNum(profileCtx.config.riskBudgetPct, 0.015), 0.001, 0.1);
  const stopLossPct = clamp(toNum(profileCtx.config.stopLossPct, 0.02), 0.0025, 0.2);
  const maxGrossLeverageInput = clamp(toNum(profileCtx.config.maxGrossLeverage, 5), 1, 20);
  const warnConcentrationPct = clamp(toNum(profileCtx.config.warnConcentrationPct, 0.4), 0.1, 0.95);

  const accountValue = toNum(state.accountValue, 0);
  const dayPnlPct = toNum(state.dayPnlPct, 0);
  const positions = Array.isArray(state.positions) ? state.positions : [];
  const candlesByCoin = state.candlesByCoin && typeof state.candlesByCoin === "object" ? state.candlesByCoin : {};
  const vpvrBins = clamp(toNum(profileCtx.config.vpvrBins, 24), 8, 80);
  const longSupportBoost = clamp(toNum(profileCtx.config.longSupportBoost, 1.1), 0.5, 2);
  const longBelowPocPenalty = clamp(toNum(profileCtx.config.longBelowPocPenalty, 0.9), 0.4, 1.2);
  const shortIntoSupportPenalty = clamp(toNum(profileCtx.config.shortIntoSupportPenalty, 0.7), 0.3, 1.2);
  const shortAtResistanceBoost = clamp(toNum(profileCtx.config.shortAtResistanceBoost, 1.15), 0.5, 2);
  const uptrendShortPenalty = clamp(toNum(profileCtx.config.uptrendShortPenalty, 0.85), 0.4, 1.2);
  const downtrendLongPenalty = clamp(toNum(profileCtx.config.downtrendLongPenalty, 0.9), 0.4, 1.2);

  const normalized = positions
    .map((p) => {
      const coin = String(p?.coin ?? p?.asset ?? p?.symbol ?? "UNKNOWN").toUpperCase();
      const size = toNum(p?.size ?? p?.szi ?? p?.positionSize ?? 0, 0);
      const markPx = toNum(p?.markPx ?? p?.markPrice ?? p?.price ?? p?.entryPx ?? 0, 0);
      const notionalRaw = toNum(p?.positionValue ?? p?.notionalUsd ?? p?.notional ?? NaN, NaN);
      const notional = Number.isFinite(notionalRaw) ? abs(notionalRaw) : abs(size * markPx);
      const declaredSide = String(p?.side ?? p?.direction ?? "").toLowerCase();
      const side = declaredSide.includes("short")
        ? "SHORT"
        : declaredSide.includes("long")
          ? "LONG"
          : size > 0
            ? "LONG"
            : size < 0
              ? "SHORT"
              : "FLAT";
      const lev = toNum(p?.leverage ?? p?.lev ?? p?.effectiveLeverage ?? NaN, NaN);
      return { coin, side, size, markPx, notionalUsd: notional, leverage: lev };
    })
    .filter((p) => p.notionalUsd > 0);

  const grossExposureUsd = normalized.reduce((a, p) => a + p.notionalUsd, 0);
  const longExposureUsd = normalized.filter((p) => p.side === "LONG").reduce((a, p) => a + p.notionalUsd, 0);
  const shortExposureUsd = normalized.filter((p) => p.side === "SHORT").reduce((a, p) => a + p.notionalUsd, 0);
  const largest = normalized.reduce((m, p) => (p.notionalUsd > m.notionalUsd ? p : m), { coin: null, notionalUsd: 0 });

  const grossLeverage = accountValue > 0 ? grossExposureUsd / accountValue : 0;
  const concentrationPct = grossExposureUsd > 0 ? largest.notionalUsd / grossExposureUsd : 0;

  let profile = "BALANCED";
  if (grossLeverage >= 4 || dayPnlPct <= -0.05 || concentrationPct >= 0.6) profile = "CONSERVATIVE";
  else if (grossLeverage <= 2 && dayPnlPct >= -0.01 && concentrationPct <= 0.35) profile = "AGGRESSIVE";

  const profileCaps = { AGGRESSIVE: 5, BALANCED: 3.5, CONSERVATIVE: 2 };
  const targetGrossLeverage = Math.min(maxGrossLeverageInput, profileCaps[profile]);
  const riskBudgetUsd = accountValue * riskBudgetPct;
  const withVpvr = normalized.map((p) => {
    const candles = Array.isArray(candlesByCoin[p.coin]) ? candlesByCoin[p.coin] : [];
    const vp = vpvrScore(candles, p.markPx, vpvrBins);
    const relToPoc = Number.isFinite(vp.pocPx) && p.markPx > 0 ? (p.markPx - vp.pocPx) / p.markPx : 0;
    let sideMultiplier = 1;
    const sideNotes = [];

    if (p.side === "LONG") {
      if (relToPoc >= 0) {
        sideMultiplier *= longSupportBoost;
        sideNotes.push("long_near_or_above_poc_boost");
      } else {
        sideMultiplier *= longBelowPocPenalty;
        sideNotes.push("long_below_poc_penalty");
      }
      if (toNum(vp.trendPct, 0) < 0) {
        sideMultiplier *= downtrendLongPenalty;
        sideNotes.push("downtrend_long_penalty");
      }
    } else if (p.side === "SHORT") {
      if (relToPoc <= 0) {
        sideMultiplier *= shortIntoSupportPenalty;
        sideNotes.push("short_into_support_penalty");
      } else {
        sideMultiplier *= shortAtResistanceBoost;
        sideNotes.push("short_above_poc_boost");
      }
      if (toNum(vp.trendPct, 0) > 0) {
        sideMultiplier *= uptrendShortPenalty;
        sideNotes.push("uptrend_short_penalty");
      }
    }

    const sideAdjustedScore = clamp(vp.score * sideMultiplier, 0.2, 2.5);
    return { ...p, vpvr: vp, sideAdjustedScore, sideNotes };
  });
  const weightSum = withVpvr.reduce((a, p) => a + toNum(p?.sideAdjustedScore, 1), 0) || 1;

  const actions = [];
  if (grossLeverage > targetGrossLeverage) {
    actions.push(
      "Reduce gross leverage from " + grossLeverage.toFixed(2) + "x to <= " +
      targetGrossLeverage.toFixed(2) + "x (trim " +
      (grossExposureUsd - targetGrossLeverage * accountValue).toFixed(2) + " USD notional)."
    );
  }
  if (concentrationPct > warnConcentrationPct) {
    actions.push(
      "Diversify exposure: largest position " + (largest.coin ?? "N/A") +
      " is " + (concentrationPct * 100).toFixed(1) + "% of gross exposure."
    );
  }
  if (actions.length === 0) {
    actions.push("Risk posture within target bands; maintain stops and monitor funding/open orders.");
  }

  const perPositionPlan = withVpvr.map((p) => {
    const weight = toNum(p?.sideAdjustedScore, 1);
    const allocatedRiskUsd = riskBudgetUsd * (weight / weightSum);
    const suggestedMaxNotionalUsd = allocatedRiskUsd / stopLossPct;
    return {
    coin: p.coin,
    side: p.side,
    currentNotionalUsd: Number(p.notionalUsd.toFixed(2)),
    vpvrBaseScore: Number(toNum(p?.vpvr?.score, 1).toFixed(3)),
    vpvrSideAdjustedScore: Number(weight.toFixed(3)),
    vpvrPocPx: Number(toNum(p?.vpvr?.pocPx, 0).toFixed(4)),
    vpvrTrendPct: Number((toNum(p?.vpvr?.trendPct, 0) * 100).toFixed(2)),
    vpvrDistanceFromPocPct: Number((toNum(p?.vpvr?.distanceFromPocPct, 0) * 100).toFixed(2)),
    vpvrSideNotes: Array.isArray(p.sideNotes) ? p.sideNotes : [],
    allocatedRiskUsd: Number(allocatedRiskUsd.toFixed(2)),
    suggestedMaxNotionalUsd: Number(suggestedMaxNotionalUsd.toFixed(2)),
    suggestedTrimUsd: Number(Math.max(0, p.notionalUsd - suggestedMaxNotionalUsd).toFixed(2))
    };
  });
  const perPositionRiskUsd = riskBudgetUsd / Math.max(1, withVpvr.length);
  const maxNotionalPerPositionUsd = perPositionRiskUsd / stopLossPct;

  result = {
    ok: true,
    profile,
    selectedInputProfile: profileCtx.profileKey,
    fetchedAt: state.fetchedAt,
    accountValueUsd: Number(accountValue.toFixed(2)),
    dayPnlPct: Number(dayPnlPct.toFixed(4)),
    exposures: {
      grossExposureUsd: Number(grossExposureUsd.toFixed(2)),
      longExposureUsd: Number(longExposureUsd.toFixed(2)),
      shortExposureUsd: Number(shortExposureUsd.toFixed(2)),
      grossLeverage: Number(grossLeverage.toFixed(3)),
      concentrationPct: Number(concentrationPct.toFixed(4)),
      largestPositionCoin: largest.coin,
      largestPositionUsd: Number((largest.notionalUsd || 0).toFixed(2))
    },
    limits: {
      riskBudgetPct,
      riskBudgetUsd: Number(riskBudgetUsd.toFixed(2)),
      stopLossPct,
      targetGrossLeverage: Number(targetGrossLeverage.toFixed(2)),
      perPositionRiskUsd: Number(perPositionRiskUsd.toFixed(2)),
      maxNotionalPerPositionUsd: Number(maxNotionalPerPositionUsd.toFixed(2)),
      vpvrBins: Math.floor(vpvrBins),
      sideBias: {
        longSupportBoost,
        longBelowPocPenalty,
        shortIntoSupportPenalty,
        shortAtResistanceBoost,
        uptrendShortPenalty,
        downtrendLongPenalty
      }
    },
    actions,
    perPositionPlan,
    openOrderCount: Array.isArray(state.openOrders) ? state.openOrders.length : 0
  };
}

export default result;
`
    }
  ]
});
