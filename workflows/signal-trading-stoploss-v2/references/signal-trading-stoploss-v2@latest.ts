import defineWorkflow from "/workspace/tools/workflow/defineWorkflow";

// ============================================
// CONFIGURATION - Edit these values as needed
// ============================================
const ASSET = "BTC";
const AMOUNT_USD = 6;
const MIN_CONFIDENCE = 0.80;
const LOOKBACK_MINUTES = 15;
const ORDERBOOK_DEPTH = 20;
const IMBALANCE_LONG_THRESHOLD = 1.15;
const IMBALANCE_SHORT_THRESHOLD = 0.87;
const MOMENTUM_CANDLES = 5;
const MAX_SPREAD = 0.001;
const SLIPPAGE_TOLERANCE = 0.10;
const STOP_LOSS_THRESHOLD = 0.50;
const MONITOR_INTERVAL_SECONDS = 5;
const MONITOR_DURATION_MINUTES = 4;
// ============================================

const MONITOR_STEPS_COUNT = Math.ceil((MONITOR_DURATION_MINUTES * 60) / MONITOR_INTERVAL_SECONDS);

// Generate monitor step code using string concatenation
function generateMonitorStepCode(stepIndex: number): string {
  const prevStepId = stepIndex === 0 ? "place_bet" : "monitor_" + (stepIndex - 1);

  let code = "// Monitor step " + stepIndex + " - check stop-loss\n";
  code += "const rawPrev = steps." + prevStepId + "?.result;\n";
  code += "const prev = rawPrev?.result ?? rawPrev;\n";
  code += "const rawBet = steps.place_bet?.result;\n";
  code += "const betResult = rawBet?.result ?? rawBet;\n";
  code += "\nlet result;\n\n";

  code += "// Check current price and stop-loss condition\n";
  code += 'const asset = String(inputs.asset || "BTC");\n';
  code += "const stopLossThreshold = Number(inputs.stopLossThreshold) || 0.50;\n";
  code += "const marketId = betResult.marketId;\n";
  code += "const outcome = betResult.outcome;\n";
  code += "const entryPrice = betResult.price;\n\n";

  code += 'const marketData = await callTool("getSeriesMarket", { asset, timeframe: "15min", selection: "current" });\n';
  code += "const markets = Array.isArray(marketData?.markets) ? marketData.markets : [];\n";
  code += "const market = markets.find((m) => String(m.id) === String(marketId));\n\n";

  code += "if (!market) {\n";
  code += '  result = { ok: true, skipped: true, reason: "Market no longer found (may have resolved)", entryPrice };\n';
  code += "} else {\n";
  code += "  const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];\n";
  code += "  const ourOutcome = outcomes.find((o) => o.name?.toLowerCase() === outcome.toLowerCase());\n";
  code += "  const currentPrice = ourOutcome?.price ? Number(ourOutcome.price) : entryPrice;\n";
  code += "  const priceRatio = currentPrice / entryPrice;\n";
  code += "  const lossPercent = (1 - priceRatio) * 100;\n\n";

  code += "  if (currentPrice > 0 && currentPrice <= entryPrice * stopLossThreshold) {\n";
  code += "    // STOP-LOSS TRIGGERED - sell position\n";
  code += "    const sharesToSell = betResult.tradeResult?.order?.filledShares || betResult.amountUsd;\n\n";

  code += "    let exitResult = null, sellAttempts = 0;\n";
  code += "    while (sellAttempts < 3) {\n";
  code += "      sellAttempts++;\n";
  code += '      exitResult = await callTool("tradePredictionMarket", {\n';
  code += '        marketId, outcome, side: "sell", amount: sharesToSell,\n';
  code += '        fillMode: "aggressive", slippageTolerance: Number(inputs.slippageTolerance) || 0.10,\n';
  code += "      });\n";
  code += '      if (exitResult?.type === "PREDICTION_TRADE_SUCCESS") break;\n';
  code += "    }\n";
  code += '    const sellSuccess = exitResult?.type === "PREDICTION_TRADE_SUCCESS";\n';
  code += '    result = { ok: true, exited: true, reason: sellSuccess ? "STOP-LOSS TRIGGERED" : "STOP-LOSS (sell failed)",\n';
  code += '      entryPrice, exitPrice: currentPrice, lossPercent: lossPercent.toFixed(1) + "%", stopLossThreshold,\n';
  code += '      exitResult, sellSuccess, sellAttempts, stepIndex: ' + stepIndex + ',\n';
  code += '      summary: "STOP-LOSS @ " + (currentPrice * 100).toFixed(1) + "% (entered @ " + (entryPrice * 100).toFixed(1) + "%, loss: " + lossPercent.toFixed(1) + "%)" + (sellSuccess ? "" : " [SELL FAILED]") };\n';
  code += "  } else {\n";
  code += '    result = { ok: true, holding: true, entryPrice, currentPrice, priceRatio: (priceRatio * 100).toFixed(1) + "%",\n';
  code += '      stopLossThreshold, stepIndex: ' + stepIndex + ', summary: "Holding @ " + (currentPrice * 100).toFixed(1) + "% (entry: " + (entryPrice * 100).toFixed(1) + "%)" };\n';
  code += "  }\n";
  code += "}\n\nexport default result;\n";

  return code;
}

// Generate condition for monitor step
// - monitor_0: check if bet was placed
// - monitor_1+: check if bet was placed AND previous step didn't exit
function generateMonitorCondition(stepIndex: number): string {
  if (stepIndex === 0) {
    // First monitor step: only run if bet was placed
    return "steps.place_bet.result.result.action === 'BET_PLACED' || steps.place_bet.result.action === 'BET_PLACED'";
  } else {
    // Subsequent steps: run if bet placed AND previous step didn't exit
    const prevStepId = "monitor_" + (stepIndex - 1);
    return "(steps.place_bet.result.result.action === 'BET_PLACED' || steps.place_bet.result.action === 'BET_PLACED') && !(steps." + prevStepId + ".result.result.exited || steps." + prevStepId + ".result.exited)";
  }
}

// Generate all monitor steps with conditions
const monitorSteps = [];
for (let i = 0; i < MONITOR_STEPS_COUNT; i++) {
  monitorSteps.push({
    id: "monitor_" + i,
    type: "ts",
    delay_seconds: MONITOR_INTERVAL_SECONDS,
    condition: generateMonitorCondition(i),
    code: generateMonitorStepCode(i),
  });
}

export default defineWorkflow({
  version: 1,
  id: "signal-trading-stoploss-v2",
  name: ASSET + " Signal-Based 15m Trading + Stop-Loss (v2)",
  description: "Analyzes " + ASSET + ", places trade if confident, monitors with " + (STOP_LOSS_THRESHOLD * 100) + "% stop-loss. Optimized with early exit.",
  stateFiles: [],  // Stateless — no shared file writes
  inputs: [
    { name: "asset", type: "string", default: ASSET },
    { name: "amountUsd", type: "number", default: AMOUNT_USD },
    { name: "minConfidence", type: "number", default: MIN_CONFIDENCE },
    { name: "slippageTolerance", type: "number", default: SLIPPAGE_TOLERANCE },
    { name: "stopLossThreshold", type: "number", default: STOP_LOSS_THRESHOLD },
  ],
  steps: [
    {
      id: "fetch_candles",
      type: "ts",
      code: `
const asset = String(inputs.asset || "BTC");
const lookbackMinutes = 15;
const now = Date.now();
const startTime = now - (lookbackMinutes * 60 * 1000);

const result = await callTool("fetchHyperliquidCandles", {
  coin: asset, interval: "1m",
  startTime: { iso: new Date(startTime).toISOString() },
  endTime: { iso: new Date(now).toISOString() },
});

const candles = Array.isArray(result) ? result : (result?.candles ?? result?.data ?? []);
let output;
if (!candles || candles.length === 0) {
  output = { ok: false, error: "No candles returned for " + asset };
} else {
  output = { ok: true, asset, candleCount: candles.length, candles };
}
export default output;
`,
    },
    {
      id: "fetch_orderbook",
      type: "ts",
      code: `
const asset = String(inputs.asset || "BTC");
const rows = await callTool("fetchHyperliquidOrderBook", { coin: asset, depth: 20 });

let output;
if (!rows || !Array.isArray(rows) || rows.length === 0) {
  output = { ok: false, error: "No orderbook returned for " + asset };
} else {
  const bids = rows.filter((r) => r.side === "bid").map((r) => ({ price: r.price, size: r.size }));
  const asks = rows.filter((r) => r.side === "ask").map((r) => ({ price: r.price, size: r.size }));
  output = { ok: true, asset, bids, asks, midPrice: rows[0]?.midPrice || 0 };
}
export default output;
`,
    },
    {
      id: "generate_signal",
      type: "ts",
      code: `
const rawCandles = steps.fetch_candles?.result;
const candleResult = rawCandles?.result ?? rawCandles;
const rawOrderbook = steps.fetch_orderbook?.result;
const orderbookResult = rawOrderbook?.result ?? rawOrderbook;

let result;
if (!candleResult?.ok || !orderbookResult?.ok) {
  result = { ok: false, error: candleResult?.error || orderbookResult?.error, signal: "NONE", confidence: 0 };
} else {
  const candles = candleResult.candles;
  const bids = orderbookResult.bids;
  const asks = orderbookResult.asks;
  const midPrice = orderbookResult.midPrice;

  // Calculate VWAP
  let vwapNum = 0, vwapDen = 0;
  for (const c of candles) {
    const tp = (Number(c.high) + Number(c.low) + Number(c.close)) / 3;
    vwapNum += tp * Number(c.volume);
    vwapDen += Number(c.volume);
  }
  const vwap = vwapDen > 0 ? vwapNum / vwapDen : midPrice;

  // Momentum
  const recent = candles.slice(-5);
  const momentum = (Number(recent[recent.length-1].close) - Number(recent[0].close)) / Number(recent[0].close);

  // Orderbook imbalance
  const bidSize = bids.reduce((sum, b) => sum + Number(b.size), 0);
  const askSize = asks.reduce((sum, a) => sum + Number(a.size), 0);
  const imbalance = askSize > 0 ? bidSize / askSize : 1;

  // Conditions
  const imbalanceLong = imbalance >= 1.15;
  const imbalanceShort = imbalance <= 0.87;
  const momentumUp = momentum > 0;
  const momentumDown = momentum < 0;
  const priceAboveVwap = midPrice > vwap;
  const priceBelowVwap = midPrice < vwap;

  const upScore = [imbalanceLong, momentumUp, priceAboveVwap].filter(Boolean).length;
  const downScore = [imbalanceShort, momentumDown, priceBelowVwap].filter(Boolean).length;

  let signal = "NONE", confidence = 0, reason = "";
  if (upScore === 3) { signal = "UP"; confidence = 0.8 + (imbalance - 1.15) * 0.5; reason = "Strong UP"; }
  else if (downScore === 3) { signal = "DOWN"; confidence = 0.8 + (0.87 - imbalance) * 0.5; reason = "Strong DOWN"; }
  else if (upScore === 2 && downScore === 0) { signal = "UP"; confidence = 0.7; reason = "Weak UP"; }
  else if (downScore === 2 && upScore === 0) { signal = "DOWN"; confidence = 0.7; reason = "Weak DOWN"; }
  else { reason = "Mixed signals: UP=" + upScore + "/3, DOWN=" + downScore + "/3"; }

  confidence = Math.min(Math.max(confidence, 0), 1);
  result = { ok: true, asset: candleResult.asset, midPrice, signal, confidence, confidenceStr: (confidence * 100).toFixed(1) + "%", reason };
}
export default result;
`,
    },
    {
      id: "get_market",
      type: "ts",
      code: `
const rawSignal = steps.generate_signal?.result;
const signalResult = rawSignal?.result ?? rawSignal;

let result;
if (!signalResult?.ok) {
  result = { ok: false, skipped: true, reason: signalResult?.error ?? "Signal generation failed" };
} else if (signalResult.signal === "NONE") {
  result = { ok: true, skipped: true, reason: "Signal is NONE: " + signalResult.reason, signal: signalResult };
} else if (signalResult.confidence < (Number(inputs.minConfidence) || 0.80)) {
  result = { ok: true, skipped: true, reason: "Confidence below threshold", signal: signalResult };
} else {
  const asset = String(inputs.asset || "BTC");
  const marketData = await callTool("getSeriesMarket", { asset, timeframe: "15min", selection: "current" });
  const markets = Array.isArray(marketData?.markets) ? marketData.markets : [];
  const market = markets[0];

  if (!market) {
    result = { ok: false, error: "No market found", signal: signalResult };
  } else {
    const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
    const upOutcome = outcomes.find((o) => o.name?.toLowerCase() === "up");
    const downOutcome = outcomes.find((o) => o.name?.toLowerCase() === "down");
    result = { ok: true, skipped: false, marketId: market.id, question: market.question,
      upPrice: upOutcome?.price ?? 0, downPrice: downOutcome?.price ?? 0, signal: signalResult };
  }
}
export default result;
`,
    },
    {
      id: "place_bet",
      type: "ts",
      code: `
const rawMarket = steps.get_market?.result;
const marketResult = rawMarket?.result ?? rawMarket;

let result;
if (!marketResult?.ok || marketResult?.skipped) {
  result = { ok: true, skipped: true, action: "SKIPPED", reason: marketResult?.reason || "Market fetch failed", signal: marketResult?.signal };
} else {
  const amountUsd = Number(inputs.amountUsd) || 6;
  const signal = marketResult.signal;
  const betSide = signal.signal;
  const outcome = betSide === "UP" ? "Up" : "Down";
  const price = betSide === "UP" ? marketResult.upPrice : marketResult.downPrice;
  const marketId = marketResult.marketId;
  const slippageTolerance = Number(inputs.slippageTolerance) || 0.10;

  let tradeResult = null, attempts = 0;
  while (attempts < 5 && tradeResult?.type !== "PREDICTION_TRADE_SUCCESS") {
    attempts++;
    tradeResult = await callTool("tradePredictionMarket", {
      marketId, outcome, side: "buy", amount: amountUsd, fillMode: "aggressive", slippageTolerance
    });
    if (tradeResult?.type === "PREDICTION_TRADE_SUCCESS") break;
  }

  if (tradeResult?.type === "PREDICTION_TRADE_SUCCESS") {
    result = { ok: true, skipped: false, action: "BET_PLACED", side: betSide, amountUsd, outcome, price, attempts,
      tradeResult, signal, marketId, question: marketResult.question,
      summary: "Placed $" + amountUsd + " " + betSide + " bet @ " + (price * 100).toFixed(1) + "%" };
  } else {
    result = { ok: false, action: "BET_FAILED", error: "Trade failed after " + attempts + " attempts", signal, marketId };
  }
}
export default result;
`,
    },
    ...monitorSteps,
    {
      id: "summary",
      type: "ts",
      code: `
const rawBet = steps.place_bet?.result;
const betResult = rawBet?.result ?? rawBet;
const rawSignal = steps.generate_signal?.result;
const signalResult = rawSignal?.result ?? rawSignal;

let lastMonitorResult = null;
for (let i = ${MONITOR_STEPS_COUNT - 1}; i >= 0; i--) {
  const stepResult = steps["monitor_" + i]?.result;
  const parsed = stepResult?.result ?? stepResult;
  if (parsed && parsed.status !== "skipped" && !parsed.passthrough) {
    lastMonitorResult = parsed;
    break;
  }
}

let summary;
if (betResult?.skipped || betResult?.action === "SKIPPED") {
  summary = { ok: true, action: "SKIPPED", reason: betResult.reason, signal: signalResult?.signal || "NONE",
    confidence: signalResult?.confidenceStr || "0%", summary: "[skip] SKIPPED: " + betResult.reason };
} else if (betResult?.action === "BET_FAILED") {
  summary = { ok: false, action: "BET_FAILED", error: betResult.error, signal: signalResult?.signal,
    confidence: signalResult?.confidenceStr, summary: "[ERR] " + betResult.error };
} else if (lastMonitorResult?.exited) {
  summary = { ok: true, action: "STOP_LOSS_EXIT", side: betResult.side, amountUsd: betResult.amountUsd,
    entryPrice: lastMonitorResult.entryPrice, exitPrice: lastMonitorResult.exitPrice, lossPercent: lastMonitorResult.lossPercent,
    signal: signalResult?.signal, confidence: signalResult?.confidenceStr, marketId: betResult.marketId,
    monitorStepTriggered: lastMonitorResult.stepIndex, summary: "[STOP-LOSS] " + lastMonitorResult.summary };
} else if (betResult?.ok && betResult?.action === "BET_PLACED") {
  summary = { ok: true, action: "BET_PLACED_AND_HELD", side: betResult.side, amountUsd: betResult.amountUsd,
    entryPrice: betResult.price, finalPrice: lastMonitorResult?.currentPrice ?? betResult.price,
    signal: signalResult?.signal, confidence: signalResult?.confidenceStr, marketId: betResult.marketId,
    monitorStepsRun: lastMonitorResult?.stepIndex !== undefined ? lastMonitorResult.stepIndex + 1 : 0,
    summary: "[ok] " + betResult.summary + (lastMonitorResult?.summary ? " | Final: " + lastMonitorResult.summary : "") };
} else {
  summary = { ok: false, action: "ERROR", error: betResult?.error, summary: "[ERR] " + (betResult?.error || "Unknown error") };
}
export default summary;
`,
    },
  ],
});
