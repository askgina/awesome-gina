import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

const workflowId = "tradfi-sniper";
const defaultSniperName = "TradFi Sniper";
const tradeStateFile = "/workspace/outputs/tradfi_sniper_trades.json";

export default defineWorkflow({
  version: 1,
  id: workflowId,
  name: "TradFi Sniper",
  description:
    "Rotate Struct close_to_bond hooks for the built-in TradFi Up/Down asset universe and buy the hooked outcome when it reaches the configured probability band.",
  triggers: [{ manual: true }],
  output_mode: "inline",
  stateFiles: [tradeStateFile],
  inputs: [
    { name: "mode", type: "string", default: "rotator", description: "Use rotator for scheduled setup runs. Webhook mode is forced when Struct sends trigger.payload." },
    { name: "sniperName", type: "string", default: defaultSniperName, description: "Base name for the condition-scoped asset watchers managed by the rotator." },
    { name: "assetSymbols", type: "string", default: "", description: "Optional comma-separated subset. Leave blank to use the built-in daily list." },
    { name: "activeWindowMinutes", type: "number", default: 0, description: "Only arm hooks for markets ending within this many minutes. Use 0 to arm all currently active daily markets." },
    { name: "minPriceDeltaPct", type: "number", default: 0, description: "Optional minimum underlying price distance from price-to-beat, in percent. 0 disables. Up uses (current - priceToBeat) / abs(priceToBeat) * 100; Down uses (priceToBeat - current) / abs(priceToBeat) * 100." },
    { name: "minProbability", type: "number", default: 0.65, description: "Minimum Up outcome probability required before buying Up." },
    { name: "maxProbability", type: "number", default: 0.99, description: "Maximum YES/Up probability allowed before buying Up." },
    { name: "minNoProbability", type: "number", default: 0.65, description: "Minimum Down outcome probability required before buying Down." },
    { name: "maxNoProbability", type: "number", default: 0.99, description: "Maximum Down outcome probability allowed before buying Down." },
    { name: "notionalUsd", type: "number", default: 10, description: "USDC notional to spend per asset market when a hook fires." },
    { name: "watcherTtlMinutes", type: "number", default: 1440, description: "How long each Struct hook remains active. Expiry is still capped by the market end time." },
    { name: "dryRun", type: "boolean", default: false, description: "When true, webhook mode validates but does not call tradePredictionMarket." },
    { name: "managedBy", type: "string", default: workflowId, description: "Metadata marker used by the rotator when replacing prior watcher recipes." },
    { name: "allowedAssetSymbol", type: "string", default: "", description: "Webhook-mode asset guard. The rotator sets this in the watcher target." },
    { name: "allowedConditionId", type: "string", default: "", description: "Webhook-mode exact condition id guard. The rotator sets this in the watcher target." },
    { name: "allowedMarketSlug", type: "string", default: "", description: "Webhook-mode market slug guard and trade identifier. The rotator sets this in the watcher target." },
    { name: "allowedEventSlug", type: "string", default: "", description: "Webhook-mode event slug guard and fallback trade identifier." },
    { name: "expectedOutcomeIndex", type: "number", description: "Webhook-mode expected outcome index. The rotator sets 0 for YES/Up and 1 for NO/Down." },
    { name: "expectedOutcome", type: "string", default: "", description: "Webhook-mode expected outcome label fallback." },
  ],
  outputs: [
    { name: "mode", value: "{{steps.run_tradfi_sniper.result.mode}}" },
    { name: "status", value: "{{steps.run_tradfi_sniper.result.status}}" },
    { name: "assetCount", value: "{{steps.run_tradfi_sniper.result.assetCount}}" },
    { name: "refreshedWatchers", value: "{{steps.run_tradfi_sniper.result.refreshedWatchers}}" },
    { name: "skippedAssets", value: "{{steps.run_tradfi_sniper.result.skippedAssets}}" },
  ],
  steps: [
    {
      id: "run_tradfi_sniper",
      name: "Rotate TradFi hooks or execute TradFi sniper",
      type: "ts",
      timeout: 120000,
      allow: [
        "listScheduledPrompts",
        "deleteScheduledPrompt",
        "createScheduledPrompt",
        "updateScheduledPromptCondition",
        "fetchUrl",
        "resolvePredictionMarketExact",
        "getSeriesMarket",
        "tradePredictionMarket",
      ],
      code: `
const result = await (async () => {
const workflowId = "tradfi-sniper";
const defaultSniperName = "TradFi Sniper";
const tradeStateFile = "/workspace/outputs/tradfi_sniper_trades.json";
const tradeStateMaxAgeMs = 36 * 60 * 60 * 1000;
const gammaBaseUrl = "https://gamma-api.polymarket.com";

const dailyAssets = [
  { symbol: "SPY", name: "SPY", seriesId: "11303", slugPrefix: "spy", helperSymbol: "SPY", expectedEndHourUtc: 20 },
  { symbol: "WTI", name: "WTI Crude Oil", seriesId: "11309", slugPrefix: "wti", helperSymbol: "WTI", expectedEndHourUtc: 21 },
  { symbol: "SPX", name: "S&P 500", seriesId: "10383", slugPrefix: "spx", helperSymbol: "SPX", expectedEndHourUtc: 20, helperEndpoints: false },
  { symbol: "NIK", name: "Nikkei 225", seriesId: "10382", slugPrefix: "nik", helperSymbol: "NIK", expectedEndHourUtc: 20, helperEndpoints: false },
  { symbol: "XAUUSD", name: "Gold", seriesId: "11307", slugPrefix: "xauusd", helperSymbol: "XAUUSD", expectedEndHourUtc: 21 },
  { symbol: "XAGUSD", name: "Silver", seriesId: "11308", slugPrefix: "xagusd", helperSymbol: "XAGUSD", expectedEndHourUtc: 21 },
  { symbol: "NVDA", name: "NVIDIA", seriesId: "10374", slugPrefix: "nvda", helperSymbol: "NVDA", expectedEndHourUtc: 20 },
  { symbol: "TSLA", name: "Tesla", seriesId: "10375", slugPrefix: "tsla", helperSymbol: "TSLA", expectedEndHourUtc: 20 },
  { symbol: "ABNB", name: "Airbnb", seriesId: "10394", slugPrefix: "abnb", helperSymbol: "ABNB", expectedEndHourUtc: 20 },
  { symbol: "AMZN", name: "Amazon", seriesId: "10378", slugPrefix: "amzn", helperSymbol: "AMZN", expectedEndHourUtc: 20 },
  { symbol: "NFLX", name: "Netflix", seriesId: "10390", slugPrefix: "nflx", helperSymbol: "NFLX", expectedEndHourUtc: 20 },
  { symbol: "AAPL", name: "Apple", seriesId: "10380", slugPrefix: "aapl", helperSymbol: "AAPL", expectedEndHourUtc: 20 },
  { symbol: "GOOGL", name: "Google", seriesId: "10377", slugPrefix: "googl", helperSymbol: "GOOGL", expectedEndHourUtc: 20 },
  { symbol: "EWY", name: "EWY", seriesId: "11304", slugPrefix: "ewy", helperSymbol: "EWY", expectedEndHourUtc: 20 },
  { symbol: "MSFT", name: "Microsoft", seriesId: "10379", slugPrefix: "msft", helperSymbol: "MSFT", expectedEndHourUtc: 20 },
  { symbol: "NG", name: "Natural Gas", seriesId: "11311", slugPrefix: "ng", helperSymbol: "NG", expectedEndHourUtc: 21 },
  { symbol: "PLTR", name: "Palantir", seriesId: "10391", slugPrefix: "pltr", helperSymbol: "PLTR", expectedEndHourUtc: 20 },
  { symbol: "HOOD", name: "Robinhood", seriesId: "10944", slugPrefix: "hood", helperSymbol: "HOOD", expectedEndHourUtc: 20 },
];

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const asRecord = (value) => (isRecord(value) ? value : {});
const asString = (value) => (typeof value === "string" ? value.trim() : "");
const asNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};
const normalizeId = (value) => asString(value).toLowerCase();
const normalizeLabel = (value) => asString(value).toLowerCase();
const normalizeSymbol = (value) => asString(value).toUpperCase();
const normalizeOutcomeAlias = (value) => {
  const normalized = normalizeLabel(value);
  if (normalized === "yes") return "up";
  if (normalized === "no") return "down";
  return normalized;
};
const clampPositive = (value, fallback) => {
  const parsed = asNumber(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
};
const clampNonNegative = (value, fallback) => {
  const parsed = asNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
};
const clampProbability = (value, fallback) => {
  const parsed = asNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};
const parseJsonMaybe = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value) || isRecord(value)) return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const firstRecord = (value) => {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
};
const payload = isRecord(trigger) && isRecord(trigger.payload) ? trigger.payload : null;
const configuredMode = asString(inputs.mode).toLowerCase();
const mode = payload ? "webhook" : configuredMode || "rotator";
const sniperName = asString(inputs.sniperName) || defaultSniperName;
const managedBy = asString(inputs.managedBy) || workflowId;
const minProbability = clampProbability(inputs.minProbability, 0.65);
const maxProbability = clampProbability(inputs.maxProbability, 0.99);
const minNoProbability = clampProbability(inputs.minNoProbability, 0.65);
const maxNoProbability = clampProbability(inputs.maxNoProbability, 0.99);
const notionalUsd = clampPositive(inputs.notionalUsd, 10);
const watcherTtlMinutes = clampPositive(inputs.watcherTtlMinutes, 1440);
const activeWindowMinutes = clampNonNegative(inputs.activeWindowMinutes, 0);
const minPriceDeltaPct = clampNonNegative(inputs.minPriceDeltaPct, 0);
const dryRun = inputs.dryRun === true;
const probabilityRangeIsValid = minProbability <= maxProbability && minNoProbability <= maxNoProbability;

const selectedAssets = () => {
  const raw = asString(inputs.assetSymbols);
  if (!raw) return dailyAssets;
  const wanted = new Set(raw.split(",").map((part) => normalizeSymbol(part)).filter(Boolean));
  return dailyAssets.filter((asset) => wanted.has(normalizeSymbol(asset.symbol)));
};
const assetBySymbol = (symbol) => dailyAssets.find((asset) => normalizeSymbol(asset.symbol) === normalizeSymbol(symbol)) ?? null;

const readTradeState = async () => {
  try {
    const raw = await fs.promises.readFile(tradeStateFile, "utf-8");
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const pruneTradeState = (state) => {
  const nowMs = Date.now();
  const next = {};
  for (const [key, value] of Object.entries(asRecord(state))) {
    const record = asRecord(value);
    const timestamp = asString(record.claimedAt) || asString(record.updatedAt) || asString(record.createdAt);
    const timestampMs = Date.parse(timestamp);
    if (!Number.isFinite(timestampMs) || nowMs - timestampMs <= tradeStateMaxAgeMs) next[key] = record;
  }
  return next;
};

const writeTradeState = async (state) => {
  const pruned = pruneTradeState(state);
  await fs.promises.writeFile(tradeStateFile, JSON.stringify(pruned, null, 2), "utf-8");
  return pruned;
};

const claimMarketTrade = async ({ assetSymbol, conditionId, marketSlug, eventSlug, outcome, probability, priceDelta }) => {
  const key = normalizeId(conditionId);
  if (!key) return { ok: false, reason: "missing_condition_id" };
  const state = await readTradeState();
  const existing = asRecord(state[key]);
  if (Object.keys(existing).length > 0) return { ok: false, reason: "market_already_claimed", existing };
  state[key] = {
    assetSymbol,
    conditionId,
    marketSlug,
    eventSlug,
    outcome,
    probability,
    priceDelta: summarizePriceDeltaCheck(priceDelta),
    notionalUsd,
    claimedAt: new Date().toISOString(),
    status: dryRun ? "dry_run_claimed" : "claimed",
  };
  await writeTradeState(state);
  return { ok: true, key, claim: state[key] };
};

const summarizeTradeResult = (tradeResult) => {
  const record = asRecord(tradeResult);
  if (Object.keys(record).length === 0) return tradeResult ?? null;
  return {
    type: asString(record.type) || null,
    success: record.success === true,
    error: asString(record.error) || null,
    orderId: asString(record.orderId ?? record.order_id) || null,
    txHash: asString(record.txHash ?? record.transactionHash ?? record.transaction_hash) || null,
  };
};

const updateMarketTradeClaim = async ({ conditionId, status, tradeResult }) => {
  const key = normalizeId(conditionId);
  if (!key) return;
  const state = await readTradeState();
  const existing = asRecord(state[key]);
  state[key] = { ...existing, conditionId, status, updatedAt: new Date().toISOString(), tradeResultSummary: summarizeTradeResult(tradeResult) };
  await writeTradeState(state);
};

const parseJsonFromFetchUrlResult = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: false, reason: "empty_fetch_url_result" };
  const marker = "Markdown Content:";
  const markerIndex = raw.indexOf(marker);
  const candidates = markerIndex >= 0 ? [raw.slice(markerIndex + marker.length).trim(), raw] : [raw];
  for (const candidate of candidates) {
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch {}
    const starts = [candidate.indexOf("["), candidate.indexOf("{")].filter((index) => index >= 0);
    if (starts.length === 0) continue;
    const start = Math.min(...starts);
    const ends = [candidate.lastIndexOf("]"), candidate.lastIndexOf("}")].filter((index) => index > start).sort((a, b) => b - a);
    for (const end of ends) {
      try {
        return { ok: true, data: JSON.parse(candidate.slice(start, end + 1)) };
      } catch {}
    }
  }
  return { ok: false, reason: "json_parse_failed", sample: raw.slice(0, 500) };
};

const fetchJsonViaHostTool = async (url) => {
  if (typeof callTool !== "function") return { ok: false, reason: "call_tool_unavailable", url };
  const response = await callTool("fetchUrl", { urls: [url], targetLanguage: "EN" });
  const results = Array.isArray(response?.results) ? response.results : [];
  const first = results[0];
  if (!isRecord(first)) return { ok: false, reason: "fetch_url_empty_result", url, detail: response };
  if (first.success === false) return { ok: false, reason: "fetch_url_failed", url, detail: first.error ?? first.result ?? response };
  const parsed = parseJsonFromFetchUrlResult(first.result);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, url, sample: parsed.sample ?? null, detail: first };
  return { ok: true, url, data: parsed.data, provider: first.provider ?? "fetchUrl" };
};

const curlJson = async (url) => {
  try {
    if (typeof fetch === "function") {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      const body = await response.text();
      if (!response.ok) {
        return { ok: false, reason: "http_failed", url, status: response.status, statusText: response.statusText, sample: body.slice(0, 500) };
      }
      return { ok: true, url, data: JSON.parse(body), provider: "fetch" };
    }
    return await fetchJsonViaHostTool(url);
  } catch (error) {
    const fetchError = String(error && error.message ? error.message : error);
    const hostResult = await fetchJsonViaHostTool(url);
    return hostResult.ok ? hostResult : { ok: false, reason: "fetch_or_host_tool_failed", url, detail: fetchError, hostResult };
  }
};

const monthSlug = (date) => ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"][date.getUTCMonth()];
const slugForDate = (asset, date) => asset.slugPrefix + "-up-or-down-on-" + monthSlug(date) + "-" + date.getUTCDate() + "-" + date.getUTCFullYear();
const fallbackSlugsForAsset = (asset) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return [slugForDate(asset, now), slugForDate(asset, yesterday), slugForDate(asset, tomorrow)];
};

const eventLooksLikeAsset = (asset, event) => {
  const slug = normalizeId(event.slug);
  if (!slug || !slug.includes("up-or-down")) return false;
  return slug === normalizeId(asset.slugPrefix) || slug.startsWith(normalizeId(asset.slugPrefix) + "-");
};
const readEndMs = (record) => {
  const endDate = asString(record.endDate ?? record.end_date);
  const endMs = Date.parse(endDate);
  return Number.isFinite(endMs) ? endMs : null;
};
const pickCurrentEvent = (asset, events) => {
  const nowMs = Date.now();
  const candidates = Array.isArray(events) ? events.filter((event) => isRecord(event)) : [];
  const open = candidates
    .filter((event) => eventLooksLikeAsset(asset, event))
    .filter((event) => event.closed !== true && event.archived !== true && event.active !== false)
    .map((event) => ({ event, endMs: readEndMs(event) }))
    .filter((item) => item.endMs === null || item.endMs > nowMs)
    .sort((a, b) => (a.endMs ?? Number.MAX_SAFE_INTEGER) - (b.endMs ?? Number.MAX_SAFE_INTEGER));
  return open.length > 0 ? open[0].event : null;
};
const marketFromEvent = (event) => {
  const markets = Array.isArray(event?.markets) ? event.markets : [];
  return markets.find((market) => isRecord(market) && market.closed !== true && market.active !== false) ?? null;
};
const fetchMarketsBySlug = async (slug) => {
  const url = gammaBaseUrl + "/markets?slug=" + encodeURIComponent(slug);
  const response = await curlJson(url);
  if (!response.ok) return response;
  const market = firstRecord(response.data);
  if (!market) return { ok: false, reason: "market_not_found_by_slug", url, slug, data: response.data };
  return { ok: true, market, url };
};
const resolveExactMarketBySlug = async ({ asset, slug }) => {
  const resolved = await callTool("resolvePredictionMarketExact", { identifiers: { marketUrl: "https://polymarket.com/event/" + slug }, options: { activeOnly: true } });
  if (!isRecord(resolved) || resolved.type !== "PREDICTION_MARKET_EXACT_SUCCESS") {
    return { ok: false, reason: "exact_market_lookup_failed", assetSymbol: asset.symbol, slug, detail: resolved };
  }
  const resolvedMarket = asRecord(resolved.resolvedMarket);
  const availableOutcomes = Array.isArray(resolvedMarket.availableOutcomes) ? resolvedMarket.availableOutcomes : [];
  const outcomes = availableOutcomes.map((outcome) => asString(asRecord(outcome).name)).filter(Boolean);
  const eventSlug = asString(resolvedMarket.eventSlug) || slug;
  const marketSlug = asString(resolvedMarket.slug) || slug;
  return {
    ok: true,
    asset,
    event: { slug: eventSlug, active: resolvedMarket.active !== false, closed: resolvedMarket.closed === true },
    market: {
      id: asString(resolvedMarket.marketId),
      slug: marketSlug,
      conditionId: asString(resolvedMarket.conditionId),
      eventSlug,
      active: resolvedMarket.active !== false,
      closed: resolvedMarket.closed === true,
      outcomes,
    },
    source: "resolvePredictionMarketExact",
  };
};
const resolveMarketViaSeriesTool = async (asset) => {
  const response = await callTool("getSeriesMarket", { seriesId: asset.seriesId, selection: "current", seriesType: "up-or-down" });
  if (!isRecord(response) || response.type === "error") {
    return { ok: false, reason: "series_tool_failed", assetSymbol: asset.symbol, seriesId: asset.seriesId, detail: response };
  }
  const markets = Array.isArray(response.markets) ? response.markets.filter((market) => isRecord(market)) : [];
  const selected = markets.find((market) => market.is_active !== false && market.is_resolved !== true) ?? markets[0] ?? null;
  if (!selected) {
    return { ok: false, reason: "series_tool_no_market", assetSymbol: asset.symbol, seriesId: asset.seriesId, detail: response };
  }
  const outcomeRecords = Array.isArray(selected.outcomes) ? selected.outcomes.filter((outcome) => isRecord(outcome)) : [];
  const outcomes = outcomeRecords.map((outcome) => asString(outcome.name)).filter(Boolean);
  const clobTokenIds = outcomeRecords.map((outcome) => asString(outcome.token_id)).filter(Boolean);
  const eventSlug = asString(selected.event_slug);
  const endDate = asString(selected.end_date);
  const market = {
    id: asString(selected.id),
    slug: asString(selected.slug) || eventSlug,
    condition_id: asString(selected.condition_id),
    conditionId: asString(selected.condition_id),
    event_slug: eventSlug,
    eventSlug,
    end_date: endDate,
    endDate,
    outcomes: JSON.stringify(outcomes.length > 0 ? outcomes : ["Up", "Down"]),
    clobTokenIds: JSON.stringify(clobTokenIds),
    active: selected.is_active !== false,
    closed: selected.is_resolved === true,
  };
  const event = {
    slug: eventSlug,
    endDate,
    end_date: endDate,
    active: selected.is_active !== false,
    closed: selected.is_resolved === true,
    archived: false,
    markets: [market],
  };
  return { ok: true, asset, event, market, source: "getSeriesMarket" };
};
const resolveMarketForAsset = async (asset) => {
  const seriesToolResult = await resolveMarketViaSeriesTool(asset);
  if (seriesToolResult.ok) return seriesToolResult;

  const eventsUrl = gammaBaseUrl + "/events?series_id=" + encodeURIComponent(asset.seriesId) + "&closed=false&limit=10";
  const eventsResponse = await curlJson(eventsUrl);
  let event = null;
  if (eventsResponse.ok) event = pickCurrentEvent(asset, eventsResponse.data);
  let exactLookup = null;
  if (!event) {
    for (const slug of fallbackSlugsForAsset(asset)) {
      exactLookup = await resolveExactMarketBySlug({ asset, slug });
      if (exactLookup.ok) return exactLookup;
      const bySlug = await curlJson(gammaBaseUrl + "/events?slug=" + encodeURIComponent(slug));
      if (!bySlug.ok) continue;
      const candidate = firstRecord(bySlug.data);
      if (candidate && candidate.closed !== true && candidate.archived !== true) {
        event = candidate;
        break;
      }
    }
  }
  if (!event) {
    return { ok: false, reason: exactLookup && !exactLookup.ok ? exactLookup.reason : eventsResponse.ok ? "no_current_daily_event" : "events_lookup_failed", assetSymbol: asset.symbol, seriesId: asset.seriesId, detail: { seriesToolResult, exactLookup, eventsResponse } };
  }
  const eventSlug = asString(event.slug);
  const embeddedMarket = marketFromEvent(event);
  let market = embeddedMarket;
  let marketLookup = null;
  if (eventSlug) {
    marketLookup = await fetchMarketsBySlug(eventSlug);
    if (marketLookup.ok) market = marketLookup.market;
  }
  if (!market) {
    return { ok: false, reason: marketLookup && !marketLookup.ok ? marketLookup.reason : "market_missing_for_event", assetSymbol: asset.symbol, seriesId: asset.seriesId, eventSlug, event, detail: marketLookup };
  }
  return { ok: true, asset, event, market };
};
const readMarketIdentity = ({ asset, event, market }) => {
  const conditionId = asString(market.condition_id ?? market.conditionId ?? market.id);
  const marketSlug = asString(market.slug) || asString(event.slug);
  const eventSlug = asString(market.event_slug ?? market.eventSlug) || asString(event.slug);
  const endDate = asString(market.end_date ?? market.endDate) || asString(event.endDate ?? event.end_date);
  const outcomes = parseJsonMaybe(market.outcomes, []);
  return { assetSymbol: asset.symbol, assetName: asset.name, seriesId: asset.seriesId, conditionId, marketSlug, eventSlug, endDate, outcomes: Array.isArray(outcomes) ? outcomes : [] };
};
const marketWithinActiveWindow = (endDate) => {
  if (activeWindowMinutes <= 0) return { ok: true, minutesUntilEnd: null };
  const endMs = Date.parse(endDate);
  if (!Number.isFinite(endMs)) return { ok: false, reason: "missing_market_end_date", minutesUntilEnd: null };
  const minutesUntilEnd = (endMs - Date.now()) / 60000;
  if (minutesUntilEnd <= 0) return { ok: false, reason: "market_already_ended", minutesUntilEnd };
  if (minutesUntilEnd > activeWindowMinutes) return { ok: false, reason: "outside_active_window", minutesUntilEnd };
  return { ok: true, minutesUntilEnd };
};
const computeExpiresAt = (marketEndDate) => {
  const nowMs = Date.now();
  const ttlMs = Math.max(1, Math.floor(watcherTtlMinutes)) * 60 * 1000;
  const ttlEndMs = nowMs + ttlMs;
  const marketEndMs = Date.parse(marketEndDate);
  const expiresMs = Number.isFinite(marketEndMs) ? Math.min(ttlEndMs, marketEndMs) : ttlEndMs;
  return new Date(expiresMs > nowMs ? expiresMs : ttlEndMs).toISOString();
};
const readFirstNumber = (record, keys) => {
  const source = asRecord(firstRecord(record) ?? record);
  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
};
const fetchPriceDeltaSnapshot = async ({ asset, eventSlug }) => {
  if (minPriceDeltaPct <= 0) return { ok: true, enabled: false, passed: true };
  if (!asset) return { ok: false, enabled: true, reason: "missing_asset_for_price_delta", minPriceDeltaPct };
  if (asset.helperEndpoints === false) {
    return { ok: false, enabled: true, reason: "price_delta_helper_unavailable", assetSymbol: asset.symbol, helperSymbol: asset.helperSymbol ?? asset.symbol, eventSlug, minPriceDeltaPct };
  }
  const slug = asString(eventSlug);
  if (!slug) return { ok: false, enabled: true, reason: "missing_event_slug_for_price_delta", assetSymbol: asset.symbol, minPriceDeltaPct };
  const helperSymbol = asString(asset.helperSymbol) || asString(asset.symbol);
  const priceToBeatResponse = await curlJson("https://polymarket.com/api/equity/price-to-beat/" + encodeURIComponent(slug));
  const currentPriceResponse = await curlJson("https://polymarket.com/api/equity/ticker-snapshot?symbol=" + encodeURIComponent(helperSymbol));
  if (!priceToBeatResponse.ok || !currentPriceResponse.ok) {
    return { ok: false, enabled: true, reason: "price_delta_lookup_failed", assetSymbol: asset.symbol, helperSymbol, eventSlug: slug, minPriceDeltaPct, priceToBeatResponse, currentPriceResponse };
  }
  const priceToBeat = readFirstNumber(priceToBeatResponse.data, ["priceToBeat", "price_to_beat", "previousClose", "previous_close"]);
  const currentPrice = readFirstNumber(currentPriceResponse.data, ["currentPrice", "current_price", "lastTradePrice", "last_trade_price", "price", "fmv"]);
  if (priceToBeat === null || currentPrice === null || priceToBeat <= 0) {
    return { ok: false, enabled: true, reason: "price_delta_values_missing", assetSymbol: asset.symbol, helperSymbol, eventSlug: slug, minPriceDeltaPct, priceToBeat, currentPrice, priceToBeatData: priceToBeatResponse.data, currentPriceData: currentPriceResponse.data };
  }
  const denominator = Math.abs(priceToBeat);
  const rawDeltaPct = ((currentPrice - priceToBeat) / denominator) * 100;
  return { ok: true, enabled: true, assetSymbol: asset.symbol, helperSymbol, eventSlug: slug, minPriceDeltaPct, priceToBeat, currentPrice, rawDeltaPct, absoluteDeltaPct: Math.abs(rawDeltaPct), priceToBeatTimestamp: priceToBeatResponse.data?.timestamp ?? null, currentPriceTimestamp: currentPriceResponse.data?.timestamp ?? null };
};
const checkPriceDeltaForSide = (snapshot, side) => {
  if (!snapshot.enabled) return { ok: true, enabled: false, passed: true, side };
  if (!snapshot.ok) return { ...snapshot, ok: false, passed: false, side };
  const denominator = Math.abs(snapshot.priceToBeat);
  const directionalDeltaPct = side === "Down" ? ((snapshot.priceToBeat - snapshot.currentPrice) / denominator) * 100 : ((snapshot.currentPrice - snapshot.priceToBeat) / denominator) * 100;
  const passed = directionalDeltaPct >= minPriceDeltaPct;
  return { ...snapshot, ok: passed, passed, side, directionalDeltaPct, reason: passed ? null : "price_delta_pct_below_threshold" };
};
const outcomeLabelForIndex = (identity, outcomeIndex, fallback) => {
  const candidate = Array.isArray(identity.outcomes) ? identity.outcomes[outcomeIndex] : null;
  const label = asString(candidate);
  return label || fallback;
};
const summarizePriceDeltaCheck = (check) => {
  if (!check || check.enabled === false) return { enabled: false };
  return {
    enabled: true,
    passed: check.passed === true,
    reason: asString(check.reason) || null,
    side: asString(check.side) || null,
    assetSymbol: asString(check.assetSymbol) || null,
    helperSymbol: asString(check.helperSymbol) || null,
    eventSlug: asString(check.eventSlug) || null,
    minPriceDeltaPct,
    priceToBeat: typeof check.priceToBeat === "number" ? check.priceToBeat : null,
    currentPrice: typeof check.currentPrice === "number" ? check.currentPrice : null,
    directionalDeltaPct: typeof check.directionalDeltaPct === "number" ? check.directionalDeltaPct : null,
    rawDeltaPct: typeof check.rawDeltaPct === "number" ? check.rawDeltaPct : null,
    absoluteDeltaPct: typeof check.absoluteDeltaPct === "number" ? check.absoluteDeltaPct : null,
    priceToBeatTimestamp: check.priceToBeatTimestamp ?? null,
    currentPriceTimestamp: check.currentPriceTimestamp ?? null,
  };
};

const findExistingManagedSnipers = async () => {
  const listed = await callTool("listScheduledPrompts", { includeDisabled: true, includeRuns: false });
  if (!isRecord(listed) || listed.success === false) return { ok: false, reason: "list_scheduled_prompts_failed", detail: listed };
  const prompts = Array.isArray(listed.data?.prompts) ? listed.data.prompts : [];
  const matches = prompts.filter((prompt) => {
    if (!isRecord(prompt) || prompt.triggerType !== "conditional") return false;
    const promptName = asString(prompt.name);
    const sameName = promptName === sniperName || promptName.startsWith(sniperName + " ");
    const metadata = asRecord(prompt.metadata);
    const sameManager = asString(metadata.managedBy) === managedBy;
    const sameWorkflow = asString(metadata.workflowId) === workflowId;
    return sameName && (sameManager || sameWorkflow);
  });
  return { ok: true, prompts: matches };
};
const deletePrompt = async (prompt) => {
  const promptId = asString(prompt.id);
  if (!promptId) return { ok: false, reason: "missing_prompt_id", prompt };
  const deleted = await callTool("deleteScheduledPrompt", { promptId, confirmDelete: true });
  const result = isRecord(deleted?.result) ? deleted.result : deleted;
  if (!isRecord(result) || result.success === false) return { ok: false, reason: "delete_scheduled_prompt_failed", promptId, detail: deleted };
  return { ok: true, promptId };
};
const buildWatcherPayload = ({ asset, identity, expiresAt, watcherName, side, outcomeIndex, outcomeLabel, probabilityFilter, priceDeltaCheck }) => {
  const targetInputs = {
    mode: "webhook",
    sniperName,
    managedBy,
    assetSymbols: "",
    activeWindowMinutes,
    minPriceDeltaPct,
    minProbability,
    maxProbability,
    minNoProbability,
    maxNoProbability,
    notionalUsd,
    watcherTtlMinutes,
    dryRun,
    allowedAssetSymbol: asset.symbol,
    allowedConditionId: identity.conditionId,
    allowedMarketSlug: identity.marketSlug,
    allowedEventSlug: identity.eventSlug,
    expectedOutcomeIndex: outcomeIndex,
    expectedOutcome: side,
  };
  const target = { kind: "workflow", workflowId, revision: "latest", inputs: targetInputs };
  const filters = { condition_ids: [identity.conditionId], position_outcome_indices: [outcomeIndex], ...probabilityFilter };
  if (identity.eventSlug) filters.event_slugs = [identity.eventSlug];
  if (outcomeLabel) filters.outcomes = [outcomeLabel];
  const condition = { provider: "struct", condition: { event: "close_to_bond", filters } };
  const ttl = { maxExecutions: 1, expiresAt };
  return {
    watcherName,
    target,
    condition,
    ttl,
    metadata: {
      agent: { name: "predictions", strategy: "fixed" },
      managedBy,
      hiddenFromAutomationsList: true,
      workflowId,
      strategy: "tradfi_sniper",
      assetSymbol: asset.symbol,
      assetName: asset.name,
      seriesId: asset.seriesId,
      conditionId: identity.conditionId,
      marketSlug: identity.marketSlug,
      eventSlug: identity.eventSlug,
      endDate: identity.endDate,
      side,
      outcome: outcomeLabel,
      outcomeIndex,
      probabilityFilter,
      priceDelta: summarizePriceDeltaCheck(priceDeltaCheck),
      minPriceDeltaPct,
      minProbability,
      maxProbability,
      minNoProbability,
      maxNoProbability,
      notionalUsd,
      activeWindowMinutes,
      expiresAt,
      dryRun,
    },
  };
};
const createWatcher = async (watcherPayload) => {
  const created = await callTool("createScheduledPrompt", { name: watcherPayload.watcherName, target: watcherPayload.target, trigger: { type: "conditional", condition: watcherPayload.condition }, ttl: watcherPayload.ttl, metadata: watcherPayload.metadata });
  const result = isRecord(created?.result) ? created.result : created;
  if (!isRecord(result) || result.success === false) return { ok: false, reason: "create_scheduled_prompt_failed", detail: created };
  return { ok: true, promptId: asString(result.data?.id ?? result.id), created: result };
};
const updateWatcher = async ({ prompt, watcherPayload }) => {
  const promptId = asString(prompt.id);
  if (!promptId) return { ok: false, reason: "missing_prompt_id", prompt };
  const updated = await callTool("updateScheduledPromptCondition", { promptId, name: watcherPayload.watcherName, target: watcherPayload.target, condition: watcherPayload.condition, ttl: watcherPayload.ttl, expiresAt: watcherPayload.ttl.expiresAt, resetRunCount: true, enabled: true });
  const result = isRecord(updated?.result) ? updated.result : updated;
  if (!isRecord(result) || result.success === false) return { ok: false, reason: "update_scheduled_prompt_condition_failed", promptId, detail: updated };
  return { ok: true, promptId: asString(result.data?.id ?? result.id) || promptId, updated: result };
};

const runRotator = async () => {
  if (!probabilityRangeIsValid) return { ok: false, mode: "rotator", status: "failed", reason: "invalid_probability_range", minProbability, maxProbability, minNoProbability, maxNoProbability };
  const assets = selectedAssets();
  if (assets.length === 0) return { ok: false, mode: "rotator", status: "failed", reason: "no_selected_assets", assetSymbols: inputs.assetSymbols };
  const existing = await findExistingManagedSnipers();
  if (!existing.ok) return { ok: false, mode: "rotator", status: "failed", reason: existing.reason, detail: existing.detail };
  const upsertResults = [];
  const skippedAssets = [];
  const usedPromptIds = new Set();
  let cleanupBlocked = false;
  for (const asset of assets) {
    const marketResult = await resolveMarketForAsset(asset);
    if (!marketResult.ok) {
      skippedAssets.push({ assetSymbol: asset.symbol, reason: marketResult.reason, detail: marketResult.detail ?? null });
      cleanupBlocked = true;
      continue;
    }
    const identity = readMarketIdentity(marketResult);
    if (!identity.conditionId) {
      skippedAssets.push({ assetSymbol: asset.symbol, reason: "market_missing_condition_id", marketSlug: identity.marketSlug, eventSlug: identity.eventSlug });
      cleanupBlocked = true;
      continue;
    }
    const windowCheck = marketWithinActiveWindow(identity.endDate);
    if (!windowCheck.ok) {
      skippedAssets.push({ assetSymbol: asset.symbol, reason: windowCheck.reason, minutesUntilEnd: windowCheck.minutesUntilEnd, marketSlug: identity.marketSlug, eventSlug: identity.eventSlug, endDate: identity.endDate });
      cleanupBlocked = true;
      continue;
    }
    const expiresAt = computeExpiresAt(identity.endDate);
    const priceDeltaSnapshot = await fetchPriceDeltaSnapshot({ asset, eventSlug: identity.eventSlug || identity.marketSlug });
    const watchers = [
      { watcherName: sniperName + " " + asset.symbol + " UP", side: "Up", outcomeIndex: 0, probabilityFilter: { min_probability: minProbability, max_probability: maxProbability } },
      { watcherName: sniperName + " " + asset.symbol + " DOWN", side: "Down", outcomeIndex: 1, probabilityFilter: { min_probability: minNoProbability, max_probability: maxNoProbability } },
    ];
    for (const watcher of watchers) {
      const outcomeLabel = outcomeLabelForIndex(identity, watcher.outcomeIndex, watcher.side);
      const priceDeltaCheck = checkPriceDeltaForSide(priceDeltaSnapshot, watcher.side);
      if (!priceDeltaCheck.ok) {
        skippedAssets.push({ assetSymbol: asset.symbol, side: watcher.side, reason: priceDeltaCheck.reason, marketSlug: identity.marketSlug, eventSlug: identity.eventSlug, endDate: identity.endDate, priceDelta: summarizePriceDeltaCheck(priceDeltaCheck) });
        cleanupBlocked = true;
        continue;
      }
      const watcherPayload = buildWatcherPayload({ asset, identity, expiresAt, priceDeltaCheck, outcomeLabel, ...watcher });
      const existingPrompt = existing.prompts.find((prompt) => isRecord(prompt) && asString(prompt.name) === watcher.watcherName);
      const upserted = existingPrompt ? await updateWatcher({ prompt: existingPrompt, watcherPayload }) : await createWatcher(watcherPayload);
      if (upserted.promptId) usedPromptIds.add(upserted.promptId);
      upsertResults.push({ assetSymbol: asset.symbol, watcherName: watcher.watcherName, action: existingPrompt ? "updated" : "created", conditionId: identity.conditionId, marketSlug: identity.marketSlug, eventSlug: identity.eventSlug, expiresAt, priceDelta: summarizePriceDeltaCheck(priceDeltaCheck), ...upserted });
      if (!upserted.ok) {
        return { ok: false, mode: "rotator", status: "failed", reason: upserted.reason, detail: upserted.detail, upsertResults, skippedAssets, assetSymbol: asset.symbol, conditionId: identity.conditionId, marketSlug: identity.marketSlug, eventSlug: identity.eventSlug, expiresAt };
      }
    }
  }
  const deleteResults = [];
  if (!cleanupBlocked) {
    for (const prompt of existing.prompts) {
      const promptId = asString(prompt.id);
      if (usedPromptIds.has(promptId)) continue;
      const deleted = await deletePrompt(prompt);
      deleteResults.push(deleted);
      if (!deleted.ok) return { ok: false, mode: "rotator", status: "failed", reason: deleted.reason, deleteResults, upsertResults, skippedAssets };
    }
  }
  const armedAssetCount = new Set(upsertResults.map((item) => item.assetSymbol)).size;
  const noActiveWindow = upsertResults.length === 0 && skippedAssets.length > 0 && skippedAssets.every((item) => item.reason === "outside_active_window" || item.reason === "market_already_ended");
  const status = upsertResults.length > 0 ? "watchers_refreshed" : noActiveWindow ? "no_assets_in_active_window" : "no_watchers_armed";
  const skipReasons = [...new Set(skippedAssets.map((item) => asString(item.reason)).filter(Boolean))];
  return {
    ok: true,
    mode: "rotator",
    status,
    reason: status !== "watchers_refreshed" ? skipReasons.join(",") || "no_assets_armed" : null,
    sniperName,
    assetCount: assets.length,
    armedAssetCount,
    skippedAssetCount: skippedAssets.length,
    skippedAssets,
    cleanupBlocked,
    cleanupSkipped: cleanupBlocked,
    cleanupSkipReason: cleanupBlocked ? "not_all_selected_assets_were_safely_refreshed" : null,
    deletedCount: deleteResults.length,
    updatedCount: upsertResults.filter((item) => item.action === "updated").length,
    createdCount: upsertResults.filter((item) => item.action === "created").length,
    watcherScheduleIds: upsertResults.map((item) => item.promptId ?? item.created?.data?.id ?? null),
    refreshedWatchers: upsertResults.map((item) => item.watcherName),
    minProbability,
    maxProbability,
    minNoProbability,
    maxNoProbability,
    activeWindowMinutes,
    minPriceDeltaPct,
    priceDeltaEnabled: minPriceDeltaPct > 0,
    notionalUsd,
    dryRun,
  };
};

const readPayloadData = () => {
  const data = isRecord(payload?.data) ? payload.data : {};
  const eventType = asString(payload?.eventType);
  const conditionId = asString(data.condition_id ?? data.conditionId);
  const marketSlug = asString(data.market_slug ?? data.marketSlug ?? data.slug);
  const eventSlug = asString(data.event_slug ?? data.eventSlug);
  const tokenId = asString(data.token_id ?? data.tokenId ?? data.position_id ?? data.positionId);
  const outcome = asString(data.outcome ?? data.outcome_name ?? data.outcomeName ?? data.position_outcome);
  const outcomeIndex = asNumber(data.position_outcome_index ?? data.positionOutcomeIndex ?? data.outcome_index ?? data.outcomeIndex);
  const probability = asNumber(data.probability ?? data.price);
  return { data, eventType, conditionId, marketSlug, eventSlug, tokenId, outcome, outcomeIndex, probability };
};
const resolveWebhookOutcome = (payloadInfo, expectedOutcomeIndex, expectedOutcome) => {
  if (payloadInfo.outcome) return { ok: true, outcome: payloadInfo.outcome, source: "payload_outcome" };
  if (expectedOutcome) return { ok: true, outcome: expectedOutcome, source: "watcher_expected_outcome" };
  const index = payloadInfo.outcomeIndex !== null ? payloadInfo.outcomeIndex : expectedOutcomeIndex;
  if (index === 0) return { ok: true, outcome: "Up", source: "outcome_index_default" };
  if (index === 1) return { ok: true, outcome: "Down", source: "outcome_index_default" };
  return { ok: false, reason: "missing_outcome" };
};
const runWebhook = async () => {
  if (!payload) return { ok: false, mode: "webhook", status: "skipped", reason: "missing_struct_payload" };
  const info = readPayloadData();
  const allowedAssetSymbol = normalizeSymbol(inputs.allowedAssetSymbol);
  const allowedConditionId = asString(inputs.allowedConditionId);
  const allowedMarketSlug = asString(inputs.allowedMarketSlug);
  const allowedEventSlug = asString(inputs.allowedEventSlug);
  const expectedOutcomeIndex = asNumber(inputs.expectedOutcomeIndex);
  const expectedOutcome = asString(inputs.expectedOutcome);
  if (!probabilityRangeIsValid) return { ok: false, mode: "webhook", status: "skipped", reason: "invalid_probability_range", minProbability, maxProbability, minNoProbability, maxNoProbability };
  if (info.eventType !== "close_to_bond") return { ok: true, mode: "webhook", status: "skipped", reason: "unsupported_event_type", eventType: info.eventType };
  if (!info.conditionId || !allowedConditionId) return { ok: false, mode: "webhook", status: "skipped", reason: "missing_condition_guard", conditionId: info.conditionId, allowedConditionId, assetSymbol: allowedAssetSymbol || null };
  if (normalizeId(info.conditionId) !== normalizeId(allowedConditionId)) return { ok: true, mode: "webhook", status: "skipped", reason: "condition_id_mismatch", conditionId: info.conditionId, allowedConditionId, assetSymbol: allowedAssetSymbol || null };
  const isNoWatcher = expectedOutcomeIndex === 1 || normalizeOutcomeAlias(expectedOutcome) === "down";
  const probabilityPassed = info.probability !== null && (isNoWatcher ? info.probability >= minNoProbability && info.probability <= maxNoProbability : info.probability >= minProbability && info.probability <= maxProbability);
  if (!probabilityPassed) {
    return { ok: true, mode: "webhook", status: "skipped", reason: isNoWatcher ? "outside_down_probability_range" : "outside_up_probability_range", assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, probability: info.probability, minProbability, maxProbability, minNoProbability, maxNoProbability };
  }
  const outcomeResult = resolveWebhookOutcome(info, expectedOutcomeIndex, expectedOutcome);
  if (!outcomeResult.ok) return { ok: false, mode: "webhook", status: "skipped", reason: outcomeResult.reason, assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, probability: info.probability };
  if (expectedOutcome && normalizeOutcomeAlias(outcomeResult.outcome) !== normalizeOutcomeAlias(expectedOutcome)) {
    return { ok: true, mode: "webhook", status: "skipped", reason: "outcome_mismatch", assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, probability: info.probability, outcome: outcomeResult.outcome, expectedOutcome };
  }
  const tradeMarketId = allowedMarketSlug || info.marketSlug || allowedEventSlug || info.eventSlug;
  if (!tradeMarketId) return { ok: false, mode: "webhook", status: "skipped", reason: "missing_trade_market_identifier", assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, probability: info.probability, outcome: outcomeResult.outcome };
  const priceDeltaSnapshot = await fetchPriceDeltaSnapshot({ asset: assetBySymbol(allowedAssetSymbol), eventSlug: allowedEventSlug || info.eventSlug || tradeMarketId });
  const priceDeltaCheck = checkPriceDeltaForSide(priceDeltaSnapshot, isNoWatcher ? "Down" : "Up");
  if (!priceDeltaCheck.ok) {
    return { ok: true, mode: "webhook", status: "skipped", reason: priceDeltaCheck.reason, assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, marketSlug: tradeMarketId, eventSlug: allowedEventSlug || info.eventSlug, outcome: outcomeResult.outcome, probability: info.probability, priceDelta: summarizePriceDeltaCheck(priceDeltaCheck) };
  }
  const claimResult = await claimMarketTrade({ assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, marketSlug: tradeMarketId, eventSlug: allowedEventSlug || info.eventSlug, outcome: outcomeResult.outcome, probability: info.probability, priceDelta: priceDeltaCheck });
  if (!claimResult.ok) {
    return { ok: true, mode: "webhook", status: "skipped_market_already_claimed", reason: claimResult.reason, assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, marketSlug: tradeMarketId, eventSlug: allowedEventSlug || info.eventSlug, outcome: outcomeResult.outcome, probability: info.probability, existingClaim: claimResult.existing ?? null };
  }
  if (dryRun) {
    return { ok: true, mode: "webhook", status: "dry_run_would_buy", assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, marketSlug: tradeMarketId, eventSlug: allowedEventSlug || info.eventSlug, tokenId: info.tokenId || null, outcome: outcomeResult.outcome, outcomeSource: outcomeResult.source, probability: info.probability, minProbability, maxProbability, minNoProbability, maxNoProbability, minPriceDeltaPct, priceDelta: summarizePriceDeltaCheck(priceDeltaCheck), notionalUsd, dryRun: true, tradeClaim: claimResult.claim };
  }
  const tradeResult = await callTool("tradePredictionMarket", { marketId: tradeMarketId, outcome: outcomeResult.outcome, side: "buy", amount: notionalUsd, maxSlippage: 0.05, executionMode: "full_immediate_fill" });
  const tradeSucceeded = isRecord(tradeResult) && tradeResult.type === "PREDICTION_TRADE_SUCCESS";
  await updateMarketTradeClaim({ conditionId: info.conditionId, status: tradeSucceeded ? "bought" : "trade_failed", tradeResult });
  return { ok: tradeSucceeded, mode: "webhook", status: tradeSucceeded ? "bought" : "trade_failed", assetSymbol: allowedAssetSymbol || null, conditionId: info.conditionId, marketSlug: tradeMarketId, eventSlug: allowedEventSlug || info.eventSlug, tokenId: info.tokenId || null, outcome: outcomeResult.outcome, outcomeSource: outcomeResult.source, probability: info.probability, minProbability, maxProbability, minNoProbability, maxNoProbability, minPriceDeltaPct, priceDelta: summarizePriceDeltaCheck(priceDeltaCheck), notionalUsd, dryRun: false, tradeClaim: claimResult.claim, tradeResult };
};

if (mode === "webhook") return runWebhook();
return runRotator();
})();

return result;
`,
    },
  ],
});
