import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

// ============================================
// CONFIGURATION
// ============================================
const STATE_FILE = "/workspace/scratch/btc_hourly";
// ============================================

export default defineWorkflow({
  version: 1,
  id: "btc-hourly-sell",
  name: "BTC Hourly Force Sell",
  description: "Force close any BTC hourly position at expiry, delete state file.",
  stateFiles: ["/workspace/scratch/btc_hourly"],
  inputs: [],
  steps: [
    {
      id: "check_and_fetch",
      type: "ts",
      code: `
// Read state file and get side from it - no position query needed
const stateFile = "/workspace/scratch/btc_hourly";

let fileExists = false;
let state: any = null;
let content = "";

try {
  content = await fs.promises.readFile(stateFile, "utf-8");
  if (content.trim() !== "") {
    fileExists = true;
    // Parse last line of state file
    const lines = content.trim().split("\\n").filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";
    if (lastLine) {
      state = {};
      for (const part of lastLine.split(", ")) {
        const [k, v] = part.split("=");
        if (k && v !== undefined) state[k.trim()] = v.trim();
      }
    }
  }
} catch {
  fileExists = false;
}

let output: any;

if (!fileExists || !state) {
  output = { ok: true, action: "STOP", reason: "No state file exists" };
} else if (state.status === "CLOSED") {
  output = { ok: true, action: "STOP", reason: "Position already closed" };
} else {
  // Get side and conditionId from state file
  const side = state.side;
  const conditionId = state.conditionId;

  if (!side) {
    output = { ok: false, error: "No side found in state file" };
  } else if (!conditionId) {
    output = { ok: false, error: "No conditionId in state file (legacy state)" };
  } else {
    // Get current market for reference
    const marketResult = await callTool("getSeriesMarket", {
      asset: "BTC",
      timeframe: "hourly",
      selection: "current",
    });

    const markets = Array.isArray(marketResult?.markets) ? marketResult.markets : [];
    const market = markets[0];

    if (!market) {
      output = { ok: false, error: "No BTC hourly market found" };
    } else {
      output = {
        ok: true,
        action: "SELL",
        marketId: market.id,
        conditionId,  // From state file - used for position matching
        side,
        state,
        fileExists,
      };
    }
  }
}

export default output;
`,
    },
    {
      id: "force_sell",
      type: "ts",
      code: `
// Force sell position - get shares from positions query, use side from state file
const rawCheck = steps.check_and_fetch?.result;
const checkResult = rawCheck?.result ?? rawCheck;

const action = checkResult?.action;
const maxRetries = 5;

let result;

if (action === "STOP") {
  result = { ok: true, action: "STOP", reason: checkResult.reason };
} else if (action === "SELL") {
  const conditionId = checkResult.conditionId;  // From state file
  const side = checkResult.side;

  // Get positions to find shares count
  const posResult = await callTool("getPolymarketPositions", {});
  const positions = Array.isArray(posResult?.positions) ? posResult.positions : [];

  // Match by conditionId + side (NOT just side - avoids matching wrong market)
  const pos = positions.find((p: any) => {
    const pConditionId = String(p.conditionId ?? "");
    const outcome = String(p.outcome ?? p.outcomeName ?? "").toLowerCase();
    return pConditionId === conditionId && outcome === side.toLowerCase();
  });

  let currentShares = Number(pos?.shares ?? pos?.size ?? 0);
  const actualMarketId = pos?.marketId ?? pos?.market_id ?? checkResult.marketId;

  if (currentShares <= 0) {
    result = { ok: true, action: "NO_POSITION", reason: "No shares found for side: " + side, positionsCount: positions.length };
  } else {
    let tradeResult: any = null;
    let attempts = 0;
    let lastError = "";
    const originalShares = currentShares;

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

      // On balance/allowance error, retry with floor-rounded shares
      const isBalanceError = errorMsg.includes("balance") || errorMsg.includes("allowance");
      const isFokError = errorMsg.includes("FOK") || errorMsg.includes("fully filled");

      if ((isBalanceError || isFokError) && attempts < maxRetries) {
        currentShares = Math.floor(currentShares * 10) / 10;
        if (currentShares <= 0) break;
        continue;
      }
      break;
    }

    result = {
      ok: tradeResult?.type !== "PREDICTION_TRADE_ERROR",
      action: "SOLD",
      actualMarketId,
      side,
      originalShares,
      soldShares: currentShares,
      tradeResult,
      attempts,
      lastError: tradeResult?.type === "PREDICTION_TRADE_ERROR" ? lastError : null,
    };
  }
} else {
  result = { ok: false, error: "Unknown action: " + action };
}

export default result;
`,
    },
    {
      id: "delete_file",
      type: "ts",
      code: `
// Only delete state file if sell confirmed successful or no position
const rawSell = steps.force_sell?.result;
const sellResult = rawSell?.result ?? rawSell;

const stateFile = "/workspace/scratch/btc_hourly";
const action = sellResult?.action;

let result;

// Only delete if:
// - Sell succeeded (ok=true AND action=SOLD)
// - OR no position exists (STOP, NO_POSITION)
// Do NOT delete if sell failed - preserves state for retry/reconciliation
const canDelete = sellResult?.ok === true &&
  (action === "SOLD" || action === "STOP" || action === "NO_POSITION");

if (!canDelete) {
  result = {
    ok: false,
    action: "CLEANUP_SKIPPED",
    fileDeleted: false,
    reason: "Sell not confirmed, preserving state for retry",
    sellResult,
  };
} else {
  try {
    await fs.promises.writeFile(stateFile, "");
    result = {
      ok: true,
      action: action || "CLEANUP",
      fileDeleted: true,
      sellResult,
    };
  } catch (e: any) {
    result = {
      ok: false,
      action: action || "CLEANUP",
      fileDeleted: false,
      deleteError: e?.message || "Unknown error",
      sellResult,
    };
  }
}

export default result;
`,
    },
  ],
});
