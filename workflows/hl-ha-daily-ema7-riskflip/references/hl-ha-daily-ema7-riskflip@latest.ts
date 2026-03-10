import defineWorkflow from "/workspace/tools/workflow/defineWorkflow"

export default defineWorkflow({
  version: 1,
  id: "hl-ha-daily-ema7-riskflip",
  name: "Hyperliquid Daily Heikin Ashi EMA7 Risk Flip",
  description: "Parameterized Hyperliquid workflow for finalized daily close crossover versus EMA(7) on Heikin Ashi closes, with risk-based sizing, idempotent daily processing, stale-order cleanup, immediate reversal flips, and protective stop placement.",
  triggers: [{ manual: true }],
  inputs: [
    { name: "ticker", type: "string", required: true },
    { name: "interval", type: "string", required: false, default: "1d" },
    { name: "emaLength", type: "number", required: false, default: 7 },
    { name: "riskPct", type: "number", required: false, default: 0.02 },
    { name: "postCloseDelayMin", type: "number", required: false, default: 3 },
    { name: "slippage", type: "number", required: false, default: 0.01 },
    { name: "minStopDistancePct", type: "number", required: false, default: 0.001 },
    { name: "maxStopDistancePct", type: "number", required: false, default: 0.15 },
    { name: "minBars", type: "number", required: false, default: 30 },
    { name: "minOrderSize", type: "number", required: false, default: 0 },
    { name: "sizeDecimals", type: "number", required: false, default: 4 },
    { name: "priceDecimals", type: "number", required: false, default: 4 },
    { name: "maxSpreadPct", type: "number", required: false, default: 0.005 },
    { name: "forceAfterClose", type: "boolean", required: false, default: false },
  ],
  output_mode: "inline",
  steps: [
    {
      id: "compute_signal",
      type: "ts",
      allow: ["fetchHyperliquidCandles", "getHyperliquidPrice", "fetchHyperliquidOrderBook"],
      code: String.raw`
const ticker = String(inputs.ticker ?? "").trim().toUpperCase()
if (!ticker) throw new Error("ticker input is required")
const interval = String(inputs.interval ?? "1d")
const emaLength = Math.max(2, Number(inputs.emaLength ?? 7))
const minBars = Math.max(emaLength + 5, Number(inputs.minBars ?? 30))
const postCloseDelayMin = Math.max(0, Number(inputs.postCloseDelayMin ?? 3))
const maxSpreadPct = Math.max(0, Number(inputs.maxSpreadPct ?? 0.005))
const forceAfterClose = Boolean(inputs.forceAfterClose)

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function normalizeRows(payload) {
  const base = payload?.data?.sql_required ? [] : (payload?.data ?? payload)
  if (Array.isArray(base)) return base
  if (Array.isArray(base?.rows)) return base.rows
  if (Array.isArray(base?.data)) return base.data
  if (Array.isArray(base?.candles)) return base.candles
  return []
}
function intervalMs(value) {
  if (value === "1d") return 24 * 60 * 60 * 1000
  const match = /^([0-9]+)(m|h|d)$/i.exec(value)
  if (!match) return 24 * 60 * 60 * 1000
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit === "m") return amount * 60 * 1000
  if (unit === "h") return amount * 60 * 60 * 1000
  return amount * 24 * 60 * 60 * 1000
}
function ema(values, length) {
  const alpha = 2 / (length + 1)
  const result = []
  let prev = null
  for (const value of values) {
    if (!Number.isFinite(value)) {
      result.push(null)
      continue
    }
    prev = prev === null ? value : (value * alpha) + (prev * (1 - alpha))
    result.push(prev)
  }
  return result
}

const rawCandles = await callTool("fetchHyperliquidCandles", { coin: ticker, interval, limit: Math.max(minBars + emaLength + 5, 60) })
const candles = normalizeRows(rawCandles)
  .map((row) => ({
    timestamp: num(row.timestamp),
    open: num(row.open),
    high: num(row.high),
    low: num(row.low),
    close: num(row.close),
    volume: num(row.volume),
  }))
  .filter((row) => row.timestamp !== null && row.open !== null && row.high !== null && row.low !== null && row.close !== null)
  .sort((a, b) => a.timestamp - b.timestamp)

if (candles.length < minBars) {
  return {
    ok: false,
    ticker,
    status: "insufficient_data",
    message: "Not enough candles to compute Heikin Ashi EMA crossover.",
    candleCount: candles.length,
    required: minBars,
  }
}

const ha = []
for (let i = 0; i < candles.length; i++) {
  const c = candles[i]
  const haClose = (c.open + c.high + c.low + c.close) / 4
  const haOpen = i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].haOpen + ha[i - 1].haClose) / 2
  const haHigh = Math.max(c.high, haOpen, haClose)
  const haLow = Math.min(c.low, haOpen, haClose)
  ha.push({ ...c, haOpen, haHigh, haLow, haClose })
}

const emaSeries = ema(ha.map((row) => row.haClose), emaLength)
const bars = ha.map((row, index) => ({ ...row, ema: emaSeries[index] }))
const lastIndex = bars.length - 1
const prevIndex = bars.length - 2
const last = bars[lastIndex]
const prev = bars[prevIndex]

if (!Number.isFinite(prev.ema) || !Number.isFinite(last.ema)) {
  return {
    ok: false,
    ticker,
    status: "ema_unavailable",
    message: "EMA series could not be computed for the latest bars.",
  }
}

const candleMs = intervalMs(interval)
const readyAtMs = last.timestamp + candleMs + (postCloseDelayMin * 60 * 1000)
const now = Date.now()
const isReady = forceAfterClose ? true : now >= readyAtMs
const priorDiff = prev.close - prev.ema
const latestDiff = last.close - last.ema
let crossover = "none"
if (priorDiff <= 0 && latestDiff > 0) crossover = "bullish"
if (priorDiff >= 0 && latestDiff < 0) crossover = "bearish"

const livePricePayload = await callTool("getHyperliquidPrice", { coin: ticker })
const livePrice = num(livePricePayload?.data?.price ?? livePricePayload?.data?.markPrice ?? livePricePayload?.price ?? livePricePayload?.markPrice)
const orderBookPayload = await callTool("fetchHyperliquidOrderBook", { coin: ticker, depth: 5 })

let lastBullishCrossDate = null
let lastBearishCrossDate = null
for (let i = 1; i < bars.length; i++) {
  const prevBar = bars[i - 1]
  const currBar = bars[i]
  if (!Number.isFinite(prevBar.ema) || !Number.isFinite(currBar.ema)) continue
  const prevDiff = prevBar.close - prevBar.ema
  const currDiff = currBar.close - currBar.ema
  if (prevDiff <= 0 && currDiff > 0) {
    lastBullishCrossDate = currBar.timestamp
  }
  if (prevDiff >= 0 && currDiff < 0) {
    lastBearishCrossDate = currBar.timestamp
  }
}

const currentSide = latestDiff > 0 ? "above" : latestDiff < 0 ? "below" : "flat"
const wouldEnterToday = crossover !== "none"
const daysSinceLastBullish = lastBullishCrossDate ? Math.floor((last.timestamp - lastBullishCrossDate) / (24 * 60 * 60 * 1000)) : null
const daysSinceLastBearish = lastBearishCrossDate ? Math.floor((last.timestamp - lastBearishCrossDate) / (24 * 60 * 60 * 1000)) : null
const orderRows = Array.isArray(orderBookPayload?.data) ? orderBookPayload.data : Array.isArray(orderBookPayload) ? orderBookPayload : []
const bestBid = num(orderRows.find((row) => row.side === "bid")?.price)
const bestAsk = num(orderRows.find((row) => row.side === "ask")?.price)
const mid = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? (bestBid + bestAsk) / 2 : livePrice
const spreadPct = Number.isFinite(bestBid) && Number.isFinite(bestAsk) && mid > 0 ? (bestAsk - bestBid) / mid : null

return {
  ok: true,
  ticker,
  interval,
  emaLength,
  candleCount: bars.length,
  latestBarTimestampMs: last.timestamp,
  latestBarTimeIso: new Date(last.timestamp).toISOString(),
  readyAtMs,
  readyAtIso: new Date(readyAtMs).toISOString(),
  isReady,
  forcedAfterClose: forceAfterClose,
  currentPrice: livePrice,
  bestBid,
  bestAsk,
  mid,
  spreadPct,
  spreadGuardOk: spreadPct === null ? true : spreadPct <= maxSpreadPct,
  signalBar: {
    timestamp: last.timestamp,
    timeIso: new Date(last.timestamp).toISOString(),
    open: last.open,
    high: last.high,
    low: last.low,
    close: last.close,
    haOpen: last.haOpen,
    haHigh: last.haHigh,
    haLow: last.haLow,
    haClose: last.haClose,
    ema: last.ema,
  },
  previousBar: {
    timestamp: prev.timestamp,
    timeIso: new Date(prev.timestamp).toISOString(),
    close: prev.close,
    ema: prev.ema,
  },
  crossover,
  direction: crossover === "bullish" ? "long" : crossover === "bearish" ? "short" : "flat",
  diagnostics: { priorDiff, latestDiff, candleMs },
  crossoverDiagnostics: {
    lastBullishCrossDate: lastBullishCrossDate ? new Date(lastBullishCrossDate).toISOString() : null,
    lastBearishCrossDate: lastBearishCrossDate ? new Date(lastBearishCrossDate).toISOString() : null,
    daysSinceLastBullish,
    daysSinceLastBearish,
    currentSide,
    currentSideValue: latestDiff,
    wouldEnterToday,
  },
}
      `,
    },
    {
      id: "plan_trade",
      type: "ts",
      allow: ["getHyperliquidAccount", "getHyperliquidPositions", "getHyperliquidOpenOrders", "getHyperliquidAssetData"],
      code: String.raw`
const signalStep = steps.compute_signal?.result
const signal = signalStep?.result ?? signalStep
const ticker = String(inputs.ticker ?? "").trim().toUpperCase()
const riskPct = Math.max(0, Number(inputs.riskPct ?? 0.02))
const minStopDistancePct = Math.max(0, Number(inputs.minStopDistancePct ?? 0.001))
const maxStopDistancePct = Math.max(minStopDistancePct, Number(inputs.maxStopDistancePct ?? 0.15))
const slippage = Math.max(0, Number(inputs.slippage ?? 0.01))
const minOrderSize = Math.max(0, Number(inputs.minOrderSize ?? 0))
const sizeDecimals = Math.max(0, Math.floor(Number(inputs.sizeDecimals ?? 4)))
const priceDecimals = Math.max(0, Math.floor(Number(inputs.priceDecimals ?? 4)))

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function roundDown(value, decimals) {
  if (!Number.isFinite(value) || value <= 0) return 0
  const factor = 10 ** decimals
  return Math.floor(value * factor) / factor
}
function normalizeOrders(payload) {
  const base = payload?.data ?? payload
  return Array.isArray(base?.orders) ? base.orders : Array.isArray(base) ? base : []
}
function normalizePositions(payload) {
  const base = payload?.data ?? payload
  return Array.isArray(base?.positions) ? base.positions : Array.isArray(base) ? base : []
}
function pickCoin(row) {
  return String(row.coin ?? row.symbol ?? row.asset ?? row.name ?? row.position?.coin ?? "").toUpperCase()
}
function pickPositionSize(row) {
  const source = row.position ?? row
  const candidates = [source.szi, source.size, source.positionSize, source.qty, source.quantity]
  for (const candidate of candidates) {
    const n = num(candidate)
    if (n !== null) return n
  }
  return 0
}
function pickEntryPrice(row) {
  const source = row.position ?? row
  const candidates = [source.entryPx, source.entryPrice, source.avgEntryPrice, source.avgPx]
  for (const candidate of candidates) {
    const n = num(candidate)
    if (n !== null) return n
  }
  return null
}
function pickOrderId(row) {
  return row.oid ?? row.orderId ?? row.id ?? row.cloid ?? null
}
function isStopLike(row) {
  const text = JSON.stringify(row).toLowerCase()
  return text.includes("stop") || text.includes("trigger")
}

if (!signal?.ok) {
  return { ok: false, status: "blocked", reason: signal?.message ?? "Signal step failed", signal }
}
if (!signal.isReady) {
  return { ok: false, status: "waiting_for_close_buffer", ticker, reason: "Latest daily bar is not past the post-close delay yet.", readyAtIso: signal.readyAtIso, signal }
}
if (!signal.spreadGuardOk) {
  return { ok: false, status: "spread_too_wide", ticker, reason: "Orderbook spread exceeds configured guard.", signal }
}
if (signal.crossover === "none") {
  return { ok: false, status: "no_signal", ticker, reason: "No fresh finalized daily close crossover versus HA EMA.", signal }
}
if (!Number.isFinite(signal.currentPrice)) {
  return { ok: false, status: "blocked", ticker, reason: "Live price unavailable for sizing.", signal }
}

const account = await callTool("getHyperliquidAccount", {})
const positionsPayload = await callTool("getHyperliquidPositions", {})
const openOrdersPayload = await callTool("getHyperliquidOpenOrders", {})
const assetData = await callTool("getHyperliquidAssetData", { coin: ticker })

const accountValue = num(account?.data?.accountValue ?? account?.accountValue)
const positions = normalizePositions(positionsPayload)
const openOrders = normalizeOrders(openOrdersPayload).filter((row) => pickCoin(row) === ticker)
const position = positions.find((row) => pickCoin(row) === ticker) ?? null
const positionSizeSigned = position ? pickPositionSize(position) : 0
const currentDirection = positionSizeSigned > 0 ? "long" : positionSizeSigned < 0 ? "short" : "flat"
const currentAbsSize = Math.abs(positionSizeSigned)
const currentEntryPrice = position ? pickEntryPrice(position) : null

if (!Number.isFinite(accountValue) || accountValue <= 0) {
  return { ok: false, status: "blocked", ticker, reason: "Hyperliquid account value is unavailable or non-positive.", account }
}

const signalDirection = signal.direction
const rawStopPrice = signalDirection === "long" ? num(signal.signalBar.haLow) : num(signal.signalBar.haHigh)
const stopPrice = roundDown(rawStopPrice, priceDecimals)
const entryPrice = num(signal.currentPrice)
const stopDistance = Math.abs(entryPrice - stopPrice)
const stopDistancePct = entryPrice > 0 ? stopDistance / entryPrice : null
const riskBudget = accountValue * riskPct
const rawSize = stopDistance > 0 ? riskBudget / stopDistance : 0
const availableMax = num(assetData?.data?.maxTradeSizes?.max ?? assetData?.maxTradeSizes?.max)
let size = rawSize
if (Number.isFinite(availableMax) && availableMax > 0) size = Math.min(size, availableMax)
const roundedSize = roundDown(size, sizeDecimals)

let action = "hold"
if (currentDirection === signalDirection) action = "hold_same_direction"
else if (currentDirection === "flat") action = "open_new"
else action = "flip"

const cancelOrderIds = openOrders.map((row) => pickOrderId(row)).filter(Boolean)
const stopOrderIds = openOrders.filter((row) => isStopLike(row)).map((row) => pickOrderId(row)).filter(Boolean)
const reasons = []
if (!Number.isFinite(stopPrice) || stopPrice <= 0) reasons.push("invalid_stop_price")
if (!Number.isFinite(stopDistance) || stopDistance <= 0) reasons.push("zero_stop_distance")
if (!Number.isFinite(stopDistancePct) || stopDistancePct < minStopDistancePct) reasons.push("stop_too_tight")
if (!Number.isFinite(stopDistancePct) || stopDistancePct > maxStopDistancePct) reasons.push("stop_too_wide")
if (!Number.isFinite(roundedSize) || roundedSize <= 0) reasons.push("size_non_positive")
if (roundedSize < minOrderSize) reasons.push("below_min_order_size")

return {
  ok: reasons.length === 0,
  status: reasons.length === 0 ? "planned" : "blocked",
  ticker,
  action,
  signalDirection,
  currentDirection,
  currentPosition: { sizeSigned: positionSizeSigned, absSize: currentAbsSize, entryPrice: currentEntryPrice, raw: position },
  accountValue,
  riskPct,
  riskBudget,
  entryPrice,
  stopPrice,
  stopDistance,
  stopDistancePct,
  rawSize,
  orderSize: roundedSize,
  slippage,
  cancelOrderIds,
  stopOrderIds,
  signal,
  assetData,
  reasons,
}
      `,
    },
    {
      id: "dedupe_gate",
      type: "ts",
      code: String.raw`
const planStep = steps.plan_trade?.result
const plan = planStep?.result ?? planStep
const ticker = String(inputs.ticker ?? "").trim().toUpperCase()
const key = "workflow:hl-ha-daily-ema7-riskflip:" + ticker

if (!plan?.ok) {
  return { ok: false, status: plan?.status ?? "blocked", key, plan }
}

const existingRaw = await kv.get(key)
let existing = null
try {
  existing = existingRaw ? JSON.parse(existingRaw) : null
} catch {
  existing = null
}

const signalBarTs = plan.signal?.latestBarTimestampMs ?? null
if (existing && existing.signalBarTs === signalBarTs && existing.action === plan.action && existing.direction === plan.signalDirection) {
  return {
    ok: false,
    status: "duplicate_bar_action",
    key,
    reason: "This bar and action were already processed.",
    existing,
    plan,
  }
}

return {
  ok: true,
  status: "clear",
  key,
  previous: existing,
  plan,
}
      `,
    },
    {
      id: "execute_trade",
      type: "ts",
      allow: ["cancelHyperliquidOrder", "placeHyperliquidOrder", "placeHyperliquidStopOrder", "getHyperliquidPositions"],
      code: String.raw`
const gateStep = steps.dedupe_gate?.result
const gate = gateStep?.result ?? gateStep
const plan = gate?.plan
const ticker = String(inputs.ticker ?? "").trim().toUpperCase()

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function normalizePositions(payload) {
  const base = payload?.data ?? payload
  return Array.isArray(base?.positions) ? base.positions : Array.isArray(base) ? base : []
}
function pickCoin(row) {
  return String(row.coin ?? row.symbol ?? row.asset ?? row.name ?? row.position?.coin ?? "").toUpperCase()
}
function pickPositionSize(row) {
  const source = row.position ?? row
  const candidates = [source.szi, source.size, source.positionSize, source.qty, source.quantity]
  for (const candidate of candidates) {
    const n = num(candidate)
    if (n !== null) return n
  }
  return 0
}

if (!gate?.ok) {
  return {
    ok: true,
    status: gate?.status ?? "skipped",
    ticker,
    skipped: true,
    reason: gate?.reason || plan?.reason || "Trade blocked or duplicate.",
    gate,
  }
}
if (plan.action === "hold_same_direction") {
  return {
    ok: true,
    status: "held",
    ticker,
    skipped: true,
    reason: "Already in same-direction position; no new entry until a future daily reversal.",
    plan,
  }
}

const cancellations = []
for (const orderId of (plan.cancelOrderIds ?? [])) {
  const cancelResult = await callTool("cancelHyperliquidOrder", { orderId, coin: ticker })
  cancellations.push({ orderId, result: cancelResult })
}

let closeResult = null
let postCloseCheck = null
if (plan.action === "flip" && Number(plan.currentPosition?.absSize ?? 0) > 0) {
  closeResult = await callTool("placeHyperliquidOrder", {
    coin: ticker,
    side: plan.currentDirection === "long" ? "sell" : "buy",
    orderType: "market",
    size: String(plan.currentPosition.absSize),
    reduceOnly: true,
    slippage: plan.slippage,
  })
  const positionsAfterClose = normalizePositions(await callTool("getHyperliquidPositions", {}))
  const maybePosition = positionsAfterClose.find((row) => pickCoin(row) === ticker) ?? null
  const remaining = maybePosition ? Math.abs(pickPositionSize(maybePosition)) : 0
  postCloseCheck = { remainingPositionSize: remaining, raw: maybePosition }
  if (remaining > 0) {
    return {
      ok: false,
      status: "flip_close_incomplete",
      ticker,
      reason: "Opposite position was not fully closed before new entry.",
      cancellations,
      closeResult,
      postCloseCheck,
      plan,
    }
  }
}

const entrySide = plan.signalDirection === "long" ? "buy" : "sell"
const entryResult = await callTool("placeHyperliquidOrder", {
  coin: ticker,
  side: entrySide,
  orderType: "market",
  size: String(plan.orderSize),
  reduceOnly: false,
  slippage: plan.slippage,
})

const stopSide = plan.signalDirection === "long" ? "sell" : "buy"
const stopResult = await callTool("placeHyperliquidStopOrder", {
  coin: ticker,
  side: stopSide,
  size: String(plan.orderSize),
  triggerPrice: String(plan.stopPrice),
  triggerType: "stop_loss",
})

return {
  ok: true,
  status: "executed",
  ticker,
  action: plan.action,
  signalDirection: plan.signalDirection,
  cancellations,
  closeResult,
  postCloseCheck,
  entryResult,
  stopResult,
  plan,
}
      `,
    },
    {
      id: "persist_run_state",
      type: "ts",
      code: String.raw`
const gateStep = steps.dedupe_gate?.result
const gate = gateStep?.result ?? gateStep
const execStep = steps.execute_trade?.result
const execution = execStep?.result ?? execStep

if (!gate?.key) {
  return { ok: false, status: "no_key", reason: "No dedupe key available.", gate, execution }
}
if (!execution || execution.status === "duplicate_bar_action") {
  return { ok: false, status: execution?.status ?? "skipped", gate, execution }
}

const plan = gate.plan
const shouldPersist = ["executed", "held"].includes(execution.status)
if (!shouldPersist) {
  return { ok: false, status: execution.status, persisted: false, gate, execution }
}

const state = {
  workflowId: "hl-ha-daily-ema7-riskflip",
  ticker: plan.ticker,
  signalBarTs: plan.signal.latestBarTimestampMs,
  signalBarIso: plan.signal.latestBarTimeIso,
  direction: plan.signalDirection,
  action: plan.action,
  storedAt: new Date().toISOString(),
}
await kv.set(gate.key, JSON.stringify(state))
return { ok: true, status: "persisted", key: gate.key, state, execution }
      `,
    },
  ],
})
