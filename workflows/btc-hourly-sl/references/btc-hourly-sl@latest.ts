import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

// ============================================
// CONFIGURATION
// ============================================
const STAKE_USD = 5;
const ENTRY_MIN_PROB = 0.80;
const ENTRY_MAX_PROB = 0.97;
const SL_PROB_THRESHOLD = 0.72;
const STATE_FILE = "/workspace/scratch/btc_hourly";
// ============================================

export default defineWorkflow({
  version: 1,
  id: "btc-hourly-sl",
  name: "BTC Hourly with Stop-Loss",
  description: "Entry at 80-97% prob, SL exit if held side drops below 72%.",
  stateFiles: ["/workspace/scratch/btc_hourly"],
  inputs: [
    { name: "stakeUsd", type: "number", default: STAKE_USD },
    { name: "entryMinProb", type: "number", default: ENTRY_MIN_PROB },
    { name: "entryMaxProb", type: "number", default: ENTRY_MAX_PROB },
    { name: "slProbThreshold", type: "number", default: SL_PROB_THRESHOLD },
  ],
  steps: [
    {
      id: "check_state",
      type: "ts",
      code: `
// Check if state file exists and read current state
const stateFile = "/workspace/scratch/btc_hourly";

let fileExists = false;
let lastLine = "";
let state: any = null;

try {
  const content = await fs.promises.readFile(stateFile, "utf-8");
  if (content.trim() === "") {
    fileExists = false;
  } else {
    fileExists = true;
    const lines = content.trim().split("\\n").filter(Boolean);
    lastLine = lines[lines.length - 1] || "";

    if (lastLine) {
      const parts = lastLine.split(", ");
      state = {};
      for (const part of parts) {
        const [key, val] = part.split("=");
        if (key && val !== undefined) {
          state[key.trim()] = val.trim();
        } else if (key) {
          state.timestamp_utc = key.trim();
        }
      }
    }
  }
} catch {
  fileExists = false;
}

export default {
  ok: true,
  fileExists,
  lastLine,
  state,
  stateFile,
};
`,
    },
    {
      id: "fetch_market",
      type: "ts",
      code: `
// Fetch current BTC hourly market
const result = await callTool("getSeriesMarket", {
  asset: "BTC",
  timeframe: "hourly",
  selection: "current",
});

const markets = Array.isArray(result?.markets) ? result.markets : [];
const market = markets[0];

let output;
if (!market) {
  output = { ok: false, error: "No BTC hourly market found" };
} else {
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
  const upOutcome = outcomes.find((o: any) => o.name?.toLowerCase() === "up");
  const downOutcome = outcomes.find((o: any) => o.name?.toLowerCase() === "down");

  output = {
    ok: true,
    marketId: market.id,
    conditionId: market.condition_id,  // CRITICAL: Used for position matching
    question: market.question,
    endsIn: market.ends_in,
    endDate: market.end_date,
    upPrice: upOutcome?.price ?? 0,
    downPrice: downOutcome?.price ?? 0,
    upTokenId: upOutcome?.token_id ?? "",
    downTokenId: downOutcome?.token_id ?? "",
  };
}
export default output;
`,
    },
    {
      id: "evaluate_action",
      type: "ts",
      code: `
// Determine action: ENTRY, SL_EXIT, HOLD, or STOP
const rawState = steps.check_state?.result;
const stateResult = rawState?.result ?? rawState;

const rawMarket = steps.fetch_market?.result;
const marketResult = rawMarket?.result ?? rawMarket;

const stakeUsd = Number(inputs.stakeUsd) || 5;
const entryMinProb = Number(inputs.entryMinProb) || 0.80;
const entryMaxProb = Number(inputs.entryMaxProb) || 0.97;
const slProbThreshold = Number(inputs.slProbThreshold) || 0.72;

let result;

if (!marketResult?.ok) {
  result = { ok: false, action: "STOP", reason: marketResult?.error ?? "Market fetch failed" };
} else if (!stateResult?.fileExists) {
  // FIRST RUN - No file exists, check for entry
  const upPrice = marketResult.upPrice;
  const downPrice = marketResult.downPrice;

  let selectedSide: string | null = null;
  let selectedProb = 0;

  const upInRange = upPrice > entryMinProb && upPrice < entryMaxProb;
  const downInRange = downPrice > entryMinProb && downPrice < entryMaxProb;

  if (upInRange && !downInRange) {
    selectedSide = "Up";
    selectedProb = upPrice;
  } else if (downInRange && !upInRange) {
    selectedSide = "Down";
    selectedProb = downPrice;
  }

  if (!selectedSide) {
    result = {
      ok: true,
      action: "STOP",
      reason: "No side in entry range " + entryMinProb + "-" + entryMaxProb,
      upPrice,
      downPrice,
    };
  } else {
    result = {
      ok: true,
      action: "ENTRY",
      selectedSide,
      selectedProb,
      stakeUsd,
      marketId: marketResult.marketId,
      conditionId: marketResult.conditionId,  // For position matching
      upPrice,
      downPrice,
    };
  }
} else {
  // FILE EXISTS - Check state
  const state = stateResult.state;
  const status = state?.status;

  if (status === "CLOSED") {
    result = { ok: true, action: "STOP", reason: "Position already closed" };
  } else if (status === "OPEN") {
    const stakeOpen = Number(state?.stake_open_usd || state?.stake_remaining_usd || 0);

    if (stakeOpen <= 0) {
      result = {
        ok: true,
        action: "CLOSE_FILE",
        reason: "Stake is zero, closing position",
        state,
      };
    } else {
      const side = state?.side;
      const heldProb = side?.toLowerCase() === "up" ? marketResult.upPrice : marketResult.downPrice;
      const entryPrice = Number(state?.entry_fill_price || 0);

      if (heldProb >= slProbThreshold) {
        result = {
          ok: true,
          action: "HOLD",
          reason: "Held prob " + heldProb.toFixed(2) + " >= " + slProbThreshold,
          side,
          heldProb,
          stakeOpen,
        };
      } else {
        result = {
          ok: true,
          action: "SL_EXIT",
          reason: "prob_below_72",
          side,
          heldProb,
          stakeOpen,
          entryPrice,
          marketId: marketResult.marketId,
          conditionId: marketResult.conditionId,  // For position matching
          upPrice: marketResult.upPrice,
          downPrice: marketResult.downPrice,
        };
      }
    }
  } else {
    result = { ok: true, action: "STOP", reason: "Unknown state: " + JSON.stringify(state) };
  }
}

export default result;
`,
    },
    {
      id: "execute_trade",
      type: "ts",
      code: `
// Execute trade based on action
const rawEval = steps.evaluate_action?.result;
const evalResult = rawEval?.result ?? rawEval;

const action = evalResult?.action;
const maxRetries = 5;

let result;

if (action === "ENTRY") {
  const marketId = evalResult.marketId;
  const selectedSide = evalResult.selectedSide;
  const stakeUsd = evalResult.stakeUsd;

  let tradeResult: any = null;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    tradeResult = await callTool("tradePredictionMarket", {
      marketId,
      outcome: selectedSide,
      side: "buy",
      amount: stakeUsd,
      orderType: "market",
      fillMode: "aggressive",
      slippageTolerance: 0.03,
      forceExecute: true,
    });

    const errorMsg = tradeResult?.error?.message || "";
    const isFokError = errorMsg.includes("FOK") || errorMsg.includes("fully filled");

    if (tradeResult?.type === "PREDICTION_TRADE_ERROR" && isFokError && attempts < maxRetries) {
      continue;
    }
    break;
  }

  const fillPrice = tradeResult?.order?.avgPrice || tradeResult?.order?.price || evalResult.selectedProb;

  result = {
    ok: tradeResult?.type !== "PREDICTION_TRADE_ERROR",
    action: "ENTRY",
    selectedSide,
    stakeUsd,
    fillPrice,
    upPrice: evalResult.upPrice,
    downPrice: evalResult.downPrice,
    tradeResult,
    attempts,
  };

} else if (action === "SL_EXIT") {
  const posResult = await callTool("getPolymarketPositions", {});
  const positions = Array.isArray(posResult?.positions) ? posResult.positions : [];

  const conditionId = evalResult.conditionId;
  const side = evalResult.side;

  // Match by conditionId + side (NOT marketId - positions use conditionId)
  const pos = positions.find((p: any) => {
    const pConditionId = String(p.conditionId ?? "");
    const outcome = String(p.outcome ?? p.outcomeName ?? "").toLowerCase();
    return pConditionId === conditionId && outcome === side.toLowerCase();
  });

  const originalShares = Number(pos?.shares ?? pos?.size ?? 0);
  const actualMarketId = pos?.marketId ?? pos?.market_id ?? evalResult.marketId;

  if (originalShares <= 0) {
    result = {
      ok: true,
      action: "SL_EXIT",
      skipped: true,
      reason: "No shares found to sell",
      evalResult,
    };
  } else {
    let tradeResult: any = null;
    let attempts = 0;
    let currentShares = originalShares;
    let lastError = "";

    while (attempts < maxRetries) {
      attempts++;
      tradeResult = await callTool("tradePredictionMarket", {
        marketId: actualMarketId,
        outcome: side,
        side: "sell",
        shares: currentShares,
        orderType: "market",
        fillMode: "aggressive",
        slippageTolerance: 0.05,
        forceExecute: true,
      });

      if (tradeResult?.type !== "PREDICTION_TRADE_ERROR") {
        break; // Success
      }

      const errorMsg = tradeResult?.error?.message || "";
      lastError = errorMsg;

      // On balance/allowance error, retry with floor-rounded shares (1dp)
      const isBalanceError = errorMsg.includes("balance") || errorMsg.includes("allowance");
      const isFokError = errorMsg.includes("FOK") || errorMsg.includes("fully filled");

      if ((isBalanceError || isFokError) && attempts < maxRetries) {
        currentShares = Math.floor(currentShares * 10) / 10;
        if (currentShares <= 0) {
          break;
        }
        continue;
      }
      break;
    }

    const exitPrice = tradeResult?.order?.avgPrice || tradeResult?.order?.price || 0;
    const entryPrice = evalResult.entryPrice || 0;
    const lossPct = entryPrice > 0 ? Math.abs((exitPrice - entryPrice) / entryPrice) : 0;

    result = {
      ok: tradeResult?.type !== "PREDICTION_TRADE_ERROR",
      action: "SL_EXIT",
      side,
      actualMarketId,
      originalShares,
      soldShares: currentShares,
      exitPrice,
      entryPrice,
      lossPct,
      reason: evalResult.reason,
      tradeResult,
      attempts,
      lastError: tradeResult?.type === "PREDICTION_TRADE_ERROR" ? lastError : null,
    };
  }

} else {
  result = {
    ok: true,
    action,
    reason: evalResult?.reason,
    noTrade: true,
    evalResult,
  };
}

export default result;
`,
    },
    {
      id: "update_file",
      type: "ts",
      code: `
// Update state file based on action
const rawTrade = steps.execute_trade?.result;
const tradeResult = rawTrade?.result ?? rawTrade;

const rawEval = steps.evaluate_action?.result;
const evalResult = rawEval?.result ?? rawEval;

const stateFile = "/workspace/scratch/btc_hourly";
const now = new Date().toISOString();

let result;

const action = tradeResult?.action;

if (action === "ENTRY" && tradeResult?.ok) {
  // Include conditionId for position matching on subsequent runs
  const line = now + ", status=OPEN, side=" + tradeResult.selectedSide +
    ", stake_open_usd=" + tradeResult.stakeUsd +
    ", entry_fill_price=" + tradeResult.fillPrice +
    ", entry_prob_up=" + tradeResult.upPrice +
    ", entry_prob_down=" + tradeResult.downPrice +
    ", conditionId=" + evalResult.conditionId;

  await fs.promises.writeFile(stateFile, line + "\\n");

  result = {
    ok: true,
    action: "ENTRY",
    fileWritten: true,
    line,
  };

} else if (action === "SL_EXIT" && tradeResult?.ok) {
  if (tradeResult?.skipped) {
    // No shares found - don't write anything, keep state as-is
    result = {
      ok: true,
      action: "SL_EXIT",
      fileWritten: false,
      skipped: true,
      reason: tradeResult.reason || "No shares to sell",
    };
  } else {
    // Actual exit trade happened - write EXIT line with proper data
    const side = tradeResult.side || evalResult?.side || "unknown";
    const exitPrice = tradeResult.exitPrice || tradeResult.fillPrice || 0;
    const stakeUsd = evalResult?.stakeOpen || 0;
    const lossPct = tradeResult.lossPct || 0;

    const exitLine = now + ", action=EXIT, status=CLOSED, side=" + side +
      ", exit_pct=1.0, exit_usd=" + stakeUsd +
      ", exit_fill_price=" + exitPrice +
      ", stake_remaining_usd=0, loss_pct=" + lossPct.toFixed(4) +
      ", reason=" + (tradeResult.reason || "stop-loss");

    let existingContent = "";
    try {
      existingContent = await fs.promises.readFile(stateFile, "utf-8");
    } catch { existingContent = ""; }
    await fs.promises.writeFile(stateFile, existingContent + exitLine + "\\n");

    result = {
      ok: true,
      action: "SL_EXIT",
      fileWritten: true,
      exitLine,
    };
  }

} else if (action === "CLOSE_FILE") {
  const closeLine = now + ", status=CLOSED";
  let existingContent = "";
  try {
    existingContent = await fs.promises.readFile(stateFile, "utf-8");
  } catch { existingContent = ""; }
  await fs.promises.writeFile(stateFile, existingContent + closeLine + "\\n");

  result = {
    ok: true,
    action: "CLOSE_FILE",
    fileWritten: true,
    closeLine,
  };

} else {
  result = {
    ok: true,
    action: action || "NONE",
    fileWritten: false,
    reason: tradeResult?.reason || "No action required",
  };
}

export default result;
`,
    },
  ],
});
