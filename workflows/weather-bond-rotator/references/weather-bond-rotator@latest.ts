import defineWorkflow from "/runtime/tools/workflow/defineWorkflow";

const workflowId = "weather-bond-rotator";
const stateFile = "/workspace/outputs/weather_bond_state.json";
const liveCorpusFile = "/workspace/outputs/weather_bond_live_corpus.json";

const defaultSeriesRegistry = [
  {
    seriesId: "10006",
    seriesSlug: "london-daily-weather",
    label: "London Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg C",
  },
  {
    seriesId: "10900",
    seriesSlug: "ankara-daily-weather",
    label: "Ankara Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg C",
  },
  {
    seriesId: "10726",
    seriesSlug: "chicago-daily-weather",
    label: "Chicago Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg F",
  },
  {
    seriesId: "10740",
    seriesSlug: "tokyo-daily-weather",
    label: "Tokyo Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg C",
  },
  {
    seriesId: "10742",
    seriesSlug: "seoul-daily-weather",
    label: "Seoul Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg C",
  },
  {
    seriesId: "10902",
    seriesSlug: "wellington-daily-weather",
    label: "Wellington Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg C",
  },
  {
    seriesId: "10739",
    seriesSlug: "atlanta-daily-weather",
    label: "Atlanta Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg F",
  },
  {
    seriesId: "10727",
    seriesSlug: "dallas-daily-weather",
    label: "Dallas Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg F",
  },
  {
    seriesId: "10005",
    seriesSlug: "nyc-daily-weather",
    label: "NYC Daily Weather",
    tier: "primary_daily_city",
    enabled: true,
    unit: "deg F",
  },
  {
    seriesId: "10741",
    seriesSlug: "shanghai-daily-weather",
    label: "Shanghai Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg C",
  },
  {
    seriesId: "10744",
    seriesSlug: "buenos-aires-daily-weather",
    label: "Buenos Aires Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg C",
  },
  {
    seriesId: "10730",
    seriesSlug: "denver-daily-weather",
    label: "Denver Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10728",
    seriesSlug: "miami-daily-weather",
    label: "Miami Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10734",
    seriesSlug: "seattle-daily-weather",
    label: "Seattle Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10743",
    seriesSlug: "toronto-daily-weather",
    label: "Toronto Daily Weather",
    tier: "secondary_daily_city",
    enabled: false,
    unit: "deg C",
  },
  {
    seriesId: "10115",
    seriesSlug: "dubai-daily-weather",
    label: "Dubai Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg C",
  },
  {
    seriesId: "10725",
    seriesSlug: "los-angeles-daily-weather",
    label: "LA Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10729",
    seriesSlug: "phoenix-daily-weather",
    label: "Phoenix Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10735",
    seriesSlug: "boston-daily-weather",
    label: "Boston Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10736",
    seriesSlug: "minneapolis-daily-weather",
    label: "Minneapolis Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg F",
  },
  {
    seriesId: "10901",
    seriesSlug: "auckland-daily-weather",
    label: "Auckland Daily Weather",
    tier: "watchlist_daily_city",
    enabled: false,
    unit: "deg C",
  },
];

export default defineWorkflow({
  version: 1,
  id: workflowId,
  name: "Weather Bond Rotator",
  description:
    "Rotate exact Struct close_to_bond watchers for allowed Polymarket weather series, then validate or execute webhook-triggered immediate buys from the same pipeline.",
  triggers: [{ manual: true }],
  output_mode: "inline",
  stateFiles: [stateFile, liveCorpusFile],
  inputs: [
    { name: "mode", type: "string", default: "rotator", description: "rotator or webhook" },
    {
      name: "seriesRegistry",
      type: "json",
      default: defaultSeriesRegistry,
      description: "Exact allowed Gamma weather series registry.",
    },
    { name: "minProbability", type: "number", default: 0.95 },
    { name: "maxNoProbability", type: "number", default: 0.05 },
    { name: "notionalUsd", type: "number", default: 5 },
    {
      name: "dryRun",
      type: "boolean",
      default: true,
      description:
        "When true, webhook mode validates and records the order intent but does not call tradePredictionMarket.",
    },
    { name: "watcherTtlHours", type: "number", default: 48 },
    { name: "maxEventsPerSeries", type: "number", default: 1 },
    { name: "maxSpread", type: "number", default: 0.02 },
    { name: "maxOrderbookAgeMs", type: "number", default: 30000 },
    { name: "minBestAskDepthUsd", type: "number", default: 0 },
    { name: "maxCandidateSpread", type: "number" },
    { name: "maxSlippage", type: "number", default: 0.01 },
    { name: "limitPriceOffset", type: "number", default: 0.005 },
    { name: "marketSelectionMode", type: "string", default: "current_event_all_markets" },
    { name: "maxMarketsPerEvent", type: "number", default: 16 },
    { name: "maxCandidatesPerEvent", type: "number", default: 32 },
    { name: "maxWatchersPerSeries", type: "number", default: 32 },
    { name: "maxWatchersTotal", type: "number", default: 256 },
    { name: "candidateScoreVersion", type: "string", default: "weather-all-strike-v1" },
    { name: "rotatorOrderbookMode", type: "string", default: "none" },
    { name: "rotatorOrderbookTopN", type: "number", default: 0 },
    { name: "externalForecasts", type: "json", default: [] },
    { name: "managedBy", type: "string", default: workflowId },
    { name: "maxTradeNotionalUsd", type: "number", default: 1 },
    { name: "maxDailyNotionalUsd", type: "number", default: 5 },
    { name: "maxPerSeriesDailyNotionalUsd", type: "number", default: 2 },
    { name: "stopAfterFirstAuto", type: "boolean", default: true },
    { name: "allowedSeriesId", type: "string", default: "" },
    { name: "allowedSeriesSlug", type: "string", default: "" },
    { name: "allowedEventSlug", type: "string", default: "" },
    { name: "allowedMarkets", type: "json", default: [] },
    { name: "expectedOutcomeIndex", type: "number" },
    { name: "expectedOutcome", type: "string", default: "" },
    { name: "candidateId", type: "string", default: "" },
    { name: "targetBondProbability", type: "number" },
  ],
  outputs: [
    { name: "mode", value: "{{steps.plan_weather_bond.result.result.mode}}" },
    { name: "status", value: "{{steps.plan_weather_bond.result.result.status}}" },
    { name: "candidateId", value: "{{steps.plan_weather_bond.result.result.candidateId}}" },
    { name: "seriesId", value: "{{steps.plan_weather_bond.result.result.seriesId}}" },
    { name: "seriesSlug", value: "{{steps.plan_weather_bond.result.result.seriesSlug}}" },
    { name: "eventSlug", value: "{{steps.plan_weather_bond.result.result.eventSlug}}" },
    { name: "conditionId", value: "{{steps.plan_weather_bond.result.result.conditionId}}" },
    { name: "marketSlug", value: "{{steps.plan_weather_bond.result.result.marketSlug}}" },
    { name: "outcome", value: "{{steps.plan_weather_bond.result.result.outcome}}" },
    { name: "probability", value: "{{steps.plan_weather_bond.result.result.probability}}" },
    { name: "notionalUsd", value: "{{steps.plan_weather_bond.result.result.notionalUsd}}" },
    { name: "orderIntentId", value: "{{steps.plan_weather_bond.result.result.orderIntentId}}" },
    {
      name: "executionStatus",
      value: "{{steps.plan_weather_bond.result.result.executionProof.status}}",
    },
    {
      name: "pnlEstimateUsd",
      value: "{{steps.plan_weather_bond.result.result.pnl.estimatedPnlUsd}}",
    },
    {
      name: "iterationLeadTimeMs",
      value: "{{steps.plan_weather_bond.result.result.iterationLeadTimeMs}}",
    },
    { name: "artifactPath", value: liveCorpusFile },
    { name: "reason", value: "{{steps.plan_weather_bond.result.result.executionProof.reason}}" },
  ],
  steps: [
    {
      id: "plan_weather_bond",
      name: "Rotate hooks or execute weather bond strategy",
      type: "ts",
      timeout: 120000,
      allow: [
        "listScheduledPrompts",
        "deleteScheduledPrompt",
        "createScheduledPrompt",
        "updateScheduledPromptCondition",
        "getSeriesMarket",
        "resolvePredictionMarketExact",
        "getPredictionOrderbook",
        "tradePredictionMarket",
      ],
      code: `
const result = await (async () => {
const workflowId = "weather-bond-rotator";
const stateFile = "/workspace/outputs/weather_bond_state.json";
const liveCorpusFile = "/workspace/outputs/weather_bond_live_corpus.json";
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const asRecord = (value) => (isRecord(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
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
const nowIso = () => new Date().toISOString();
const minProbability = asNumber(inputs.minProbability) ?? 0.95;
const maxNoProbability = asNumber(inputs.maxNoProbability) ?? 0.05;
const notionalUsd = Math.max(0, asNumber(inputs.notionalUsd) ?? 5);
const maxTradeNotionalUsd = Math.min(5, Math.max(0, asNumber(inputs.maxTradeNotionalUsd) ?? 1));
const maxDailyNotionalUsd = Math.max(0, asNumber(inputs.maxDailyNotionalUsd) ?? 5);
const maxPerSeriesDailyNotionalUsd = Math.max(0, asNumber(inputs.maxPerSeriesDailyNotionalUsd) ?? 2);
const maxSpread = Math.max(0, asNumber(inputs.maxSpread) ?? 0.02);
const maxSlippage = Math.max(0, asNumber(inputs.maxSlippage) ?? 0.01);
const maxOrderbookAgeMs = Math.max(0, asNumber(inputs.maxOrderbookAgeMs) ?? 30000);
const minBestAskDepthUsd = Math.max(0, asNumber(inputs.minBestAskDepthUsd) ?? 0);
const maxCandidateSpread = Math.max(0, asNumber(inputs.maxCandidateSpread) ?? maxSpread);
const limitPriceOffset = Math.max(0, asNumber(inputs.limitPriceOffset) ?? 0.005);
const watcherTtlHours = Math.max(1, asNumber(inputs.watcherTtlHours) ?? 48);
const maxEventsPerSeries = Math.max(1, Math.floor(asNumber(inputs.maxEventsPerSeries) ?? 1));
const requestedMarketSelectionMode = normalizeLabel(inputs.marketSelectionMode) || "current_event_all_markets";
const marketSelectionMode = ["current_primary", "current_event_all_markets"].includes(requestedMarketSelectionMode) ? requestedMarketSelectionMode : "current_event_all_markets";
const maxMarketsPerEvent = Math.max(0, Math.floor(asNumber(inputs.maxMarketsPerEvent) ?? 16));
const maxCandidatesPerEvent = Math.max(0, Math.floor(asNumber(inputs.maxCandidatesPerEvent) ?? 32));
const maxWatchersPerSeries = Math.max(0, Math.floor(asNumber(inputs.maxWatchersPerSeries) ?? 32));
const maxWatchersTotal = Math.max(0, Math.floor(asNumber(inputs.maxWatchersTotal) ?? 256));
const candidateScoreVersion = asString(inputs.candidateScoreVersion) || "weather-all-strike-v1";
const requestedRotatorOrderbookMode = normalizeLabel(inputs.rotatorOrderbookMode) || "none";
const rotatorOrderbookMode = ["none", "top_candidates"].includes(requestedRotatorOrderbookMode) ? requestedRotatorOrderbookMode : "none";
const rotatorOrderbookTopN = Math.min(25, Math.max(0, Math.floor(asNumber(inputs.rotatorOrderbookTopN) ?? 0)));
const probabilityInUnitInterval = (value) => {
  const probability = asNumber(value);
  return probability !== null && probability >= 0 && probability <= 1;
};
const externalForecasts = asArray(inputs.externalForecasts).map(asRecord).filter((forecast) => {
  return Boolean(asString(forecast.source)) && Boolean(asString(forecast.timestamp)) && Boolean(asString(forecast.city)) && Boolean(asString(forecast.date)) && Boolean(asString(forecast.units)) && Boolean(asString(forecast.modelVersion)) && probabilityInUnitInterval(forecast.probability);
});
const managedBy = asString(inputs.managedBy) || workflowId;
const dryRun = inputs.dryRun !== false;
const stopAfterFirstAuto = inputs.stopAfterFirstAuto !== false;
const payload = isRecord(trigger) && isRecord(trigger.payload) ? trigger.payload : null;
const mode = payload ? "webhook" : normalizeLabel(inputs.mode) || "rotator";
const fallbackRegistry = [
  { seriesId: "10006", seriesSlug: "london-daily-weather", label: "London Daily Weather", tier: "primary_daily_city", enabled: true },
  { seriesId: "10005", seriesSlug: "nyc-daily-weather", label: "NYC Daily Weather", tier: "primary_daily_city", enabled: true }
];
const registryInput = Array.isArray(inputs.seriesRegistry) && inputs.seriesRegistry.length > 0 ? inputs.seriesRegistry : fallbackRegistry;
const registry = registryInput
  .filter(isRecord)
  .map((item) => ({
    seriesId: asString(item.seriesId),
    seriesSlug: asString(item.seriesSlug),
    label: asString(item.label),
    tier: asString(item.tier) || "primary_daily_city",
    enabled: item.enabled !== false,
    seriesType: asString(item.seriesType),
    maxEvents: Math.max(1, Math.floor(asNumber(item.maxEvents) ?? maxEventsPerSeries)),
  }))
  .filter((item) => item.seriesId && item.seriesSlug && item.enabled && item.tier !== "natural_disaster_adjacent");
const stableStringify = (value) => {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (isRecord(value)) return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
  return JSON.stringify(value);
};
const stableHash = (value) => {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};
const query = async (text, params) => {
  const rows = await sql(text, params ?? []);
  return Array.isArray(rows) ? rows : [];
};
const ensureTables = async () => {
  await query("CREATE TABLE IF NOT EXISTS weather_bond_delivery_claims (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, webhook_id TEXT NOT NULL, deduplication_id TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS weather_bond_delivery_claims_uidx ON weather_bond_delivery_claims (webhook_id, deduplication_id)");
  await query("CREATE TABLE IF NOT EXISTS weather_bond_candidates (id TEXT PRIMARY KEY, series_id TEXT, series_slug TEXT, event_slug TEXT, market_slug TEXT, condition_id TEXT, token_id TEXT, side TEXT, probability REAL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS weather_bond_candidates_uidx ON weather_bond_candidates (condition_id, token_id, side)");
  await query("CREATE TABLE IF NOT EXISTS weather_bond_plans (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL, plan_hash TEXT NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL)");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS weather_bond_plans_uidx ON weather_bond_plans (candidate_id, plan_hash)");
  await query("CREATE TABLE IF NOT EXISTS weather_bond_order_intents (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL, intent_json TEXT NOT NULL, external_order_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS weather_bond_order_intents_key_uidx ON weather_bond_order_intents (idempotency_key)");
  await query("CREATE TABLE IF NOT EXISTS weather_bond_exposure_ledger (id TEXT PRIMARY KEY, order_intent_id TEXT NOT NULL, series_id TEXT, delta_notional_usd REAL NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL)");
  await query("CREATE TABLE IF NOT EXISTS weather_bond_skips (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, reason TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)");
};
const writeState = async (state) => fs.promises.writeFile(stateFile, JSON.stringify(state, null, 2), "utf-8");
const writeSkip = async (reason, detail) => {
  await ensureTables();
  await query("INSERT INTO weather_bond_skips (run_id, reason, payload_json, created_at) VALUES (?, ?, ?, ?)", [run.id, reason, JSON.stringify(detail), nowIso()]);
  const executionProof = { ok: true, status: "skipped", reason };
  const state = { workflowId, runId: run.id, mode, status: "skipped", reason, detail, executionProof };
  const corpus = { capturedAtIso: nowIso(), payload, skip: { reason, detail }, executionProof };
  await fs.promises.writeFile(liveCorpusFile, JSON.stringify(corpus, null, 2), "utf-8");
  await writeState(state);
  return state;
};
const readToolPayload = (toolResult) => (isRecord(toolResult?.result) ? toolResult.result : toolResult);
const readToolOk = (toolResult) => {
  const payload = readToolPayload(toolResult);
  return toolResult?.ok !== false && payload?.ok !== false && payload?.success !== false;
};
const readToolError = (toolResult) => {
  const payload = readToolPayload(toolResult);
  return asString(
    payload?.error ??
      payload?.message ??
      payload?.data?.error ??
      payload?.data?.message ??
      toolResult?.error ??
      toolResult?.message,
  );
};
const readToolPromptId = (toolResult) => {
  const payload = readToolPayload(toolResult);
  return asString(payload?.data?.id ?? payload?.data?.promptId ?? payload?.id ?? payload?.promptId);
};
const parseStringArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => asString(item)).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};
const parseNumberArray = (value) => (Array.isArray(value) ? value.map(asNumber).filter((item) => item !== null) : []);
const readMarket = (market, series, eventSlug) => {
  const record = asRecord(market);
  const outcomeRecords = asArray(record.outcomes).filter(isRecord);
  const outcomes = outcomeRecords.length > 0 ? outcomeRecords.map((outcome) => asString(outcome.name)).filter(Boolean) : parseStringArray(record.outcomes);
  const tokenIds = outcomeRecords.length > 0 ? outcomeRecords.map((outcome) => asString(outcome.tokenId ?? outcome.token_id)).filter(Boolean) : parseStringArray(record.clobTokenIds ?? record.clob_token_ids);
  const prices = outcomeRecords.length > 0 ? outcomeRecords.map((outcome) => asNumber(outcome.probability ?? outcome.price)).filter((item) => item !== null) : parseNumberArray(record.outcomePrices ?? record.outcome_prices);
  const conditionId = asString(record.conditionId ?? record.condition_id);
  const slug = asString(record.slug ?? record.marketSlug ?? record.market_slug);
  const active = record.active === true || record.is_active === true;
  const closed = record.closed === true || record.is_resolved === true;
  const acceptingOrders = record.acceptingOrders !== false && record.accepting_orders !== false;
  const enableOrderBook = record.enableOrderBook !== false && record.enable_order_book !== false;
  const eligible = active && !closed && acceptingOrders && enableOrderBook && conditionId && slug && outcomes.length >= 2 && tokenIds.length >= 2;
  return {
    marketId: asString(record.id) || slug || conditionId,
    conditionId,
    slug,
    eventSlug: asString(record.eventSlug ?? record.event_slug) || eventSlug,
    endDate: asString(record.endDate ?? record.end_date),
    seriesId: series.seriesId,
    seriesSlug: series.seriesSlug,
    question: asString(record.question ?? record.title),
    outcomes: outcomes.map((name, index) => ({ name, index, tokenId: tokenIds[index] ?? "", probability: prices[index] ?? null })),
    eligible,
  };
};
const describeMarket = (market) => ({ marketId: market.marketId, marketSlug: market.slug, conditionId: market.conditionId, question: market.question, candidateCount: market.outcomes.length });
const buildCandidateId = (seriesId, eventSlug, market, outcomeIndex, tokenId) => "weather_candidate_" + stableHash({ seriesId, eventSlug, conditionId: market.conditionId, tokenId, outcomeIndex });
const eventDateKey = (event) => {
  const parsed = Date.parse(asString(event.endDate));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
};
const cityAliases = { newyork: "nyc", newyorkcity: "nyc" };
const cityKey = (value) => {
  const normalized = normalizeLabel(value).replace(/[^a-z0-9]/g, "");
  return cityAliases[normalized] || normalized;
};
const forecastHasCandidateScope = (forecast) => {
  if (asString(forecast.tokenId)) return true;
  const hasMarketOrCondition = Boolean(asString(forecast.conditionId) || asString(forecast.marketSlug));
  const hasOutcomeScope = Boolean(asString(forecast.side) || asNumber(forecast.outcomeIndex) !== null);
  return hasMarketOrCondition && hasOutcomeScope;
};
const forecastCityMatches = (forecast, event, market) => {
  const forecastCity = cityKey(forecast.city);
  if (!forecastCity) return false;
  const candidateCities = [event.series?.label, event.series?.seriesSlug, event.title, event.eventSlug, market.slug, market.question].map(cityKey).filter(Boolean);
  return candidateCities.some((candidateCity) => candidateCity === forecastCity || candidateCity.startsWith(forecastCity) || candidateCity.includes(forecastCity));
};
const findExternalForecast = (event, market, outcomeIndex, tokenId, side) => externalForecasts.find((forecast) => {
  const forecastSide = normalizeLabel(forecast.side);
  const cityMatches = forecastCityMatches(forecast, event, market);
  const candidateScopeMatches = forecastHasCandidateScope(forecast);
  const tokenMatches = !asString(forecast.tokenId) || normalizeId(forecast.tokenId) === normalizeId(tokenId);
  const conditionMatches = !asString(forecast.conditionId) || normalizeId(forecast.conditionId) === normalizeId(market.conditionId);
  const outcomeIndexMatches = asNumber(forecast.outcomeIndex) === null || asNumber(forecast.outcomeIndex) === outcomeIndex;
  const marketMatches = !asString(forecast.marketSlug) || asString(forecast.marketSlug) === market.slug;
  const eventMatches = !asString(forecast.eventSlug) || asString(forecast.eventSlug) === event.eventSlug;
  const seriesMatches = !asString(forecast.seriesSlug) || asString(forecast.seriesSlug) === event.series.seriesSlug;
  const dateMatches = !asString(forecast.date) || asString(forecast.date) === eventDateKey(event);
  const sideMatches = !forecastSide || forecastSide === side;
  return cityMatches && candidateScopeMatches && tokenMatches && conditionMatches && outcomeIndexMatches && marketMatches && eventMatches && seriesMatches && dateMatches && sideMatches;
});
const buildCandidate = (event, market, outcomeIndex) => {
  const outcome = market.outcomes[outcomeIndex];
  const tokenId = asString(outcome?.tokenId);
  if (!outcome || !tokenId) return null;
  const probability = asNumber(outcome.probability);
  const yesProbability = asNumber(market.outcomes[0]?.probability);
  const isNo = outcomeIndex === 1;
  const targetBondProbability = isNo ? (probability ?? (yesProbability === null ? null : 1 - yesProbability)) : probability;
  const structTriggerProbability = isNo ? (yesProbability ?? (probability === null ? null : 1 - probability)) : probability;
  const side = isNo ? "no" : "yes";
  const externalForecast = findExternalForecast(event, market, outcomeIndex, tokenId, side);
  const forecastImpliedProbability = asNumber(externalForecast?.probability);
  const forecastEdgeProbability = targetBondProbability === null || forecastImpliedProbability === null ? null : forecastImpliedProbability - targetBondProbability;
  const forecastEdge = externalForecast ? {
    source: asString(externalForecast.source),
    timestamp: asString(externalForecast.timestamp),
    city: asString(externalForecast.city),
    date: asString(externalForecast.date),
    units: asString(externalForecast.units),
    modelVersion: asString(externalForecast.modelVersion),
    marketImpliedProbability: targetBondProbability,
    forecastImpliedProbability,
    edgeProbability: forecastEdgeProbability,
  } : null;
  return {
    candidateId: buildCandidateId(event.series.seriesId, event.eventSlug, market, outcomeIndex, tokenId),
    event,
    market,
    outcomeIndex,
    outcome: outcome.name,
    tokenId,
    side,
    probability,
    yesProbability,
    structTriggerProbability,
    targetBondProbability,
    forecastEdge,
    score: null,
    scorePartial: true,
    scoreVersion: candidateScoreVersion,
    riskFlags: ["rotator_orderbook_not_scored"],
    orderbookStatus: "metadata_only",
    orderbookLookupRequested: false,
    economics: null,
  };
};
const askDepthUsd = (asks) => asks.reduce((sum, level) => {
  const price = asNumber(level.price);
  const size = asNumber(level.size);
  return price === null || size === null || price <= 0 || size <= 0 ? sum : sum + price * size;
}, 0);
const selectEventsForSeries = async (series) => {
  const requestedSeriesType = marketSelectionMode === "current_primary" ? "up-or-down" : (asString(series.seriesType) || "event-ladder");
  const response = await callTool("getSeriesMarket", { seriesId: series.seriesId, selection: "current", seriesType: requestedSeriesType });
  if (!isRecord(response) || response.type === "error") return [];
  const eligibleMarkets = asArray(response.markets).map((market) => readMarket(market, series, asString(market?.eventSlug ?? market?.event_slug))).filter((market) => market.eligible);
  const selectedMarkets = marketSelectionMode === "current_primary" ? eligibleMarkets.slice(0, 1) : eligibleMarkets.slice(0, maxMarketsPerEvent);
  const firstMarket = selectedMarkets[0];
  if (!firstMarket) return [];
  const eventSlug = asString(firstMarket.eventSlug);
  const endDate = asString(firstMarket.endDate);
  const event = { series, eventSlug, endDate, title: series.label, markets: selectedMarkets, eligibleMarketCount: eligibleMarkets.length, omittedMarkets: eligibleMarkets.slice(selectedMarkets.length).map(describeMarket), requestedSeriesType };
  return event.eventSlug && event.markets.length > 0 && Number.isFinite(Date.parse(event.endDate)) && Date.parse(event.endDate) > Date.now() ? [event].slice(0, series.maxEvents ?? maxEventsPerSeries) : [];
};
const computeExpiresAt = (eventEndDate) => {
  const nowMs = Date.now();
  const ttlEndMs = nowMs + watcherTtlHours * 60 * 60 * 1000;
  const eventEndMs = Date.parse(eventEndDate);
  const expiresMs = Number.isFinite(eventEndMs) ? Math.min(ttlEndMs, eventEndMs) : ttlEndMs;
  return new Date(expiresMs > nowMs ? expiresMs : ttlEndMs).toISOString();
};
const listManagedWatchers = async () => {
  const listed = await callTool("listScheduledPrompts", { includeDisabled: true, includeRuns: false });
  const prompts = Array.isArray(listed?.data?.prompts) ? listed.data.prompts : [];
  return prompts.filter((prompt) => {
    const metadata = asRecord(prompt?.metadata);
    return asString(metadata.managedBy) === managedBy && asString(metadata.workflowId) === workflowId;
  });
};
const buildWatcherPayload = (candidate) => {
  const { event, market, outcomeIndex, outcome, tokenId } = candidate;
  const isNo = outcomeIndex === 1;
  const watcherName = "Weather Bond " + event.series.seriesSlug + " " + market.slug + " " + outcome;
  const allowedMarkets = [{ seriesId: event.series.seriesId, seriesSlug: event.series.seriesSlug, eventSlug: event.eventSlug, marketSlug: market.slug, conditionId: market.conditionId, marketId: market.marketId, question: market.question, outcomes: market.outcomes }];
  return {
    name: watcherName,
    target: {
      kind: "workflow",
      workflowId,
      revision: "latest",
      inputs: { mode: "webhook", seriesRegistry: registry, minProbability, maxNoProbability, notionalUsd, dryRun, maxSpread, maxOrderbookAgeMs, maxSlippage, limitPriceOffset, marketSelectionMode, candidateScoreVersion, managedBy, maxTradeNotionalUsd, maxDailyNotionalUsd, maxPerSeriesDailyNotionalUsd, stopAfterFirstAuto, allowedSeriesId: event.series.seriesId, allowedSeriesSlug: event.series.seriesSlug, allowedEventSlug: event.eventSlug, allowedMarkets, expectedOutcomeIndex: outcomeIndex, expectedOutcome: outcome, candidateId: candidate.candidateId, targetBondProbability: candidate.targetBondProbability, yesProbability: candidate.yesProbability, structTriggerProbability: candidate.structTriggerProbability },
    },
    condition: { provider: "struct", condition: { event: "close_to_bond", filters: { condition_ids: [market.conditionId], position_outcome_indices: [outcomeIndex], ...(isNo ? { max_probability: maxNoProbability } : { min_probability: minProbability }) } } },
    ttl: { maxExecutions: 1, expiresAt: computeExpiresAt(event.endDate) },
    metadata: { agent: { name: "predictions", strategy: "fixed" }, managedBy, workflowId, strategy: "weather_bond_rotator", marketSelectionMode, candidateScoreVersion, candidateId: candidate.candidateId, scorePartial: candidate.scorePartial, riskFlags: candidate.riskFlags, seriesId: event.series.seriesId, seriesSlug: event.series.seriesSlug, eventSlug: event.eventSlug, marketSlug: market.slug, conditionId: market.conditionId, tokenId, outcome, outcomeIndex, targetBondProbability: candidate.targetBondProbability, yesProbability: candidate.yesProbability, structTriggerProbability: candidate.structTriggerProbability },
  };
};
const applyOrderbookSummary = (candidate, summary) => ({
  ...candidate,
  score: summary.score,
  scorePartial: summary.score === null,
  riskFlags: summary.score === null ? [summary.rejectedReason || summary.status || "rotator_orderbook_not_scored"] : [],
  orderbookStatus: summary.status,
  orderbookLookupRequested: true,
  economics: summary.economics,
});
const decisionDriversForCandidate = (candidate) => {
  const drivers = [];
  if ((candidate.orderbookStatus || "metadata_only") === "fresh") drivers.push("execution_quality");
  if (hasPositiveForecastEdge(candidate)) drivers.push("forecast_edge");
  if (drivers.length === 0) drivers.push("market_probability");
  return drivers;
};
const scoreRotatorCandidateOrderbook = async (candidate) => {
  const summary = { candidateId: candidate.candidateId, tokenId: candidate.tokenId, requested: true, succeeded: false, score: null, status: "missing_orderbook", economics: null, fill: null, bestBid: null, spread: null, stale: false, rejectedReason: "" };
  let orderbook = null;
  try {
    orderbook = await callTool("getPredictionOrderbook", { tokenId: candidate.tokenId, levels: 50, slippageSizes: [1, 5, 10] });
  } catch (error) {
    summary.rejectedReason = "missing_orderbook";
    return { candidate: applyOrderbookSummary(candidate, summary), summary };
  }
  if (orderbook?.type !== "PREDICTION_ORDERBOOK_SUCCESS") {
    summary.rejectedReason = "missing_orderbook";
    return { candidate: applyOrderbookSummary(candidate, summary), summary };
  }
  summary.succeeded = true;
  if (normalizeId(orderbook.tokenId) && normalizeId(orderbook.tokenId) !== normalizeId(candidate.tokenId)) {
    summary.status = "identity_mismatch";
    summary.rejectedReason = "identity_mismatch";
    return { candidate: applyOrderbookSummary(candidate, summary), summary };
  }
  const timestampMs = parseTimestampMs(orderbook.timestamp);
  const ageMs = timestampMs !== null ? Date.now() - timestampMs : Number.POSITIVE_INFINITY;
  const asks = asArray(orderbook.asks).map(asRecord);
  const bids = asArray(orderbook.bids).map(asRecord);
  const bestBid = asNumber(bids[0]?.price);
  const fill = computeBuyFill(asks, notionalUsd);
  const spread = fill && bestBid !== null ? fill.bestAsk - bestBid : null;
  const sideProbability = candidate.targetBondProbability;
  const forecastProbability = asNumber(candidate.forecastEdge?.forecastImpliedProbability);
  const forecastEdgeProbability = asNumber(candidate.forecastEdge?.edgeProbability);
  const scoringProbability = forecastProbability ?? sideProbability;
  const limitPrice = Math.min(0.99, (sideProbability ?? 0) + limitPriceOffset);
  const fillableUsd = askDepthUsd(asks);
  summary.fill = fill;
  summary.bestBid = bestBid;
  summary.spread = spread;
  summary.economics = fill
    ? {
        bestAsk: fill.bestAsk,
        bestBid,
        spread,
        fillableUsd,
        estimatedCostUsd: fill.totalCost,
        sharesAcquired: fill.filledShares,
        expectedPayoutUsd: sideProbability === null ? null : fill.filledShares * sideProbability,
        estimatedPnlUsd: sideProbability === null ? null : fill.filledShares * sideProbability - fill.totalCost,
        marketImpliedProbability: sideProbability,
        forecastImpliedProbability: forecastProbability,
        forecastEdgeProbability,
        forecastAdjustedExpectedPayoutUsd: scoringProbability === null ? null : fill.filledShares * scoringProbability,
        forecastAdjustedEstimatedPnlUsd: scoringProbability === null ? null : fill.filledShares * scoringProbability - fill.totalCost,
        orderbookAgeMs: ageMs,
        limitPrice,
      }
    : { bestAsk: null, bestBid, spread, fillableUsd, estimatedCostUsd: null, sharesAcquired: 0, expectedPayoutUsd: null, estimatedPnlUsd: null, marketImpliedProbability: sideProbability, forecastImpliedProbability: forecastProbability, forecastEdgeProbability, forecastAdjustedExpectedPayoutUsd: null, forecastAdjustedEstimatedPnlUsd: null, orderbookAgeMs: ageMs, limitPrice };
  if (ageMs < 0 || ageMs > maxOrderbookAgeMs) {
    summary.stale = true;
    summary.status = "stale";
    summary.rejectedReason = "stale";
  } else if (!fill || !fill.fullyFillable || fillableUsd < minBestAskDepthUsd) {
    summary.status = "insufficient_liquidity";
    summary.rejectedReason = "insufficient_liquidity";
  } else if (spread === null || spread < 0 || spread > maxCandidateSpread) {
    summary.status = "blocked_by_spread";
    summary.rejectedReason = "blocked_by_spread";
  } else if (fill.averageFillPrice - fill.bestAsk > maxSlippage) {
    summary.status = "slippage_too_high";
    summary.rejectedReason = "slippage_too_high";
  } else if (sideProbability === null || fill.bestAsk > limitPrice) {
    summary.status = "blocked_by_price";
    summary.rejectedReason = "blocked_by_price";
  } else {
    const expectedPayoutUsd = fill.filledShares * scoringProbability;
    summary.score = expectedPayoutUsd - fill.totalCost;
    summary.status = "fresh";
  }
  summary.economics = summary.economics === null ? null : { ...summary.economics, candidateId: candidate.candidateId, side: candidate.side, askPrice: fill?.bestAsk ?? null, status: summary.status };
  return { candidate: applyOrderbookSummary(candidate, summary), summary };
};
const buildRotatorOrderbookSummary = (candidates, reads) => ({
  mode: rotatorOrderbookMode,
  topN: rotatorOrderbookTopN,
  requested: reads.length,
  succeeded: reads.filter((read) => read.succeeded).length,
  failed: reads.filter((read) => !read.succeeded).length,
  scoredCandidateIds: reads.filter((read) => read.score !== null).map((read) => read.candidateId),
  rejectedCandidateIds: reads.filter((read) => read.score === null).map((read) => read.candidateId),
  statusCounts: candidates.reduce((counts, candidate) => {
    const status = candidate.orderbookStatus || "metadata_only";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {}),
  reads,
});
const compareStableText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const candidateTriggerReady = (candidate) => {
  const triggerProbability = asNumber(candidate.structTriggerProbability);
  if (triggerProbability === null) return false;
  return candidate.side === "no" ? triggerProbability <= maxNoProbability : triggerProbability >= minProbability;
};
const compareNullableNumberDesc = (left, right) => {
  if (left !== null && right !== null && left !== right) return right - left;
  if (left !== null && right === null) return -1;
  if (left === null && right !== null) return 1;
  return 0;
};
const orderbookSelectionBucket = (candidate) => {
  const score = asNumber(candidate.score);
  if (score !== null && score > 0) return 0;
  if (hasPositiveForecastEdge(candidate) && (candidate.orderbookStatus || "metadata_only") === "metadata_only") return 1;
  if (score !== null) return 2;
  return (candidate.orderbookStatus || "metadata_only") === "metadata_only" ? 3 : 4;
};
const metadataRankRotatorCandidates = (candidates) =>
  candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftReady = candidateTriggerReady(left.candidate);
      const rightReady = candidateTriggerReady(right.candidate);
      if (leftReady !== rightReady) return leftReady ? -1 : 1;
      const probabilityCompare = compareNullableNumberDesc(asNumber(left.candidate.targetBondProbability), asNumber(right.candidate.targetBondProbability));
      if (probabilityCompare !== 0) return probabilityCompare;
      const eventCompare = compareStableText(asString(left.candidate.event?.eventSlug), asString(right.candidate.event?.eventSlug));
      if (eventCompare !== 0) return eventCompare;
      const marketCompare = compareStableText(asString(left.candidate.market?.slug), asString(right.candidate.market?.slug));
      if (marketCompare !== 0) return marketCompare;
      const outcomeCompare = left.candidate.outcomeIndex - right.candidate.outcomeIndex;
      if (outcomeCompare !== 0) return outcomeCompare;
      const idCompare = compareStableText(asString(left.candidate.candidateId), asString(right.candidate.candidateId));
      if (idCompare !== 0) return idCompare;
      return left.index - right.index;
    })
    .map((item) => item.candidate);
const forecastEdgeProbability = (candidate) => asNumber(candidate.forecastEdge?.edgeProbability);
const hasPositiveForecastEdge = (candidate) => (forecastEdgeProbability(candidate) ?? 0) > 0;
const orderbookReadRankRotatorCandidates = (candidates) => {
  const metadataRankedCandidates = metadataRankRotatorCandidates(candidates);
  const metadataRankByCandidateId = new Map(metadataRankedCandidates.map((candidate, index) => [candidate.candidateId, index]));
  return metadataRankedCandidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftEdge = forecastEdgeProbability(left.candidate) ?? 0;
      const rightEdge = forecastEdgeProbability(right.candidate) ?? 0;
      const leftPositive = leftEdge > 0;
      const rightPositive = rightEdge > 0;
      if (leftPositive !== rightPositive) return leftPositive ? -1 : 1;
      if (leftPositive && leftEdge !== rightEdge) return rightEdge - leftEdge;
      return (metadataRankByCandidateId.get(left.candidate.candidateId) ?? left.index) - (metadataRankByCandidateId.get(right.candidate.candidateId) ?? right.index);
    })
    .map((item) => item.candidate);
};
const scoreRotatorCandidates = async (candidates, budget, selectedOrderbookCandidateIds = null) => {
  const remainingBudget = budget ? Math.max(0, budget.limit - budget.reads.length) : rotatorOrderbookTopN;
  const rankedCandidates = rotatorOrderbookMode === "top_candidates" ? metadataRankRotatorCandidates(candidates) : candidates;
  const orderbookRankedCandidates = rotatorOrderbookMode === "top_candidates" ? orderbookReadRankRotatorCandidates(candidates) : candidates;
  const orderbookCandidates = selectedOrderbookCandidateIds instanceof Set ? orderbookRankedCandidates.filter((candidate) => selectedOrderbookCandidateIds.has(candidate.candidateId)) : orderbookRankedCandidates;
  const readCount = rotatorOrderbookMode === "top_candidates" ? Math.min(remainingBudget, orderbookCandidates.length, 25) : 0;
  if (readCount <= 0) return { candidates: rankedCandidates, summary: buildRotatorOrderbookSummary(rankedCandidates, []) };
  const scoredById = new Map();
  const reads = [];
  for (const candidate of orderbookCandidates.slice(0, readCount)) {
    const scored = await scoreRotatorCandidateOrderbook(candidate);
    scoredById.set(candidate.candidateId, scored.candidate);
    reads.push(scored.summary);
  }
  if (budget) budget.reads.push(...reads);
  const rescoredCandidates = rankedCandidates.map((candidate) => scoredById.get(candidate.candidateId) ?? candidate);
  const sortedCandidates = rescoredCandidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftBucket = orderbookSelectionBucket(left.candidate);
      const rightBucket = orderbookSelectionBucket(right.candidate);
      if (leftBucket !== rightBucket) return leftBucket - rightBucket;
      const leftScore = asNumber(left.candidate.score);
      const rightScore = asNumber(right.candidate.score);
      if (leftScore !== null && rightScore !== null && leftScore !== rightScore) return rightScore - leftScore;
      if (leftScore !== null && rightScore === null) return -1;
      if (leftScore === null && rightScore !== null) return 1;
      if (leftScore !== null && rightScore !== null) {
        const leftEconomics = asRecord(left.candidate.economics);
        const rightEconomics = asRecord(right.candidate.economics);
        const leftAsk = asNumber(leftEconomics.bestAsk ?? leftEconomics.askPrice);
        const rightAsk = asNumber(rightEconomics.bestAsk ?? rightEconomics.askPrice);
        if (leftAsk !== null && rightAsk !== null && leftAsk !== rightAsk) return leftAsk - rightAsk;
        const leftSpread = asNumber(leftEconomics.spread);
        const rightSpread = asNumber(rightEconomics.spread);
        if (leftSpread !== null && rightSpread !== null && leftSpread !== rightSpread) return leftSpread - rightSpread;
        const leftDepth = asNumber(leftEconomics.fillableUsd);
        const rightDepth = asNumber(rightEconomics.fillableUsd);
        if (leftDepth !== null && rightDepth !== null && leftDepth !== rightDepth) return rightDepth - leftDepth;
        return left.candidate.candidateId < right.candidate.candidateId ? -1 : left.candidate.candidateId > right.candidate.candidateId ? 1 : 0;
      }
      return left.index - right.index;
    })
    .map((item) => item.candidate);
  return { candidates: sortedCandidates, summary: buildRotatorOrderbookSummary(sortedCandidates, reads) };
};
const runRotator = async () => {
  await ensureTables();
  const selectedEvents = [];
  for (const series of registry) selectedEvents.push(...(await selectEventsForSeries(series)));
  const orderbookBudget = { limit: rotatorOrderbookMode === "top_candidates" ? rotatorOrderbookTopN : 0, reads: [] };
  const eventCandidates = selectedEvents.map((event) => ({
    event,
    eligibleCandidates: event.markets.flatMap((market) => [buildCandidate(event, market, 0), buildCandidate(event, market, 1)].filter(Boolean)),
  }));
  const selectedOrderbookCandidateIds =
    rotatorOrderbookMode === "top_candidates" && rotatorOrderbookTopN > 0
      ? new Set(orderbookReadRankRotatorCandidates(eventCandidates.flatMap((item) => item.eligibleCandidates)).slice(0, rotatorOrderbookTopN).map((candidate) => candidate.candidateId))
      : null;
  const globalScoredCandidates = (await scoreRotatorCandidates(eventCandidates.flatMap((item) => item.eligibleCandidates), orderbookBudget, selectedOrderbookCandidateIds)).candidates;
  const globalRankByCandidateId = new Map(globalScoredCandidates.map((candidate, index) => [candidate.candidateId, index]));
  const scoredCandidateById = new Map(globalScoredCandidates.map((candidate) => [candidate.candidateId, candidate]));
  const rankedCandidateUniverse = globalScoredCandidates;
  const eventSelectedCandidateIds = new Set();
  const eventCandidateSummaries = [];
  for (const { event, eligibleCandidates } of eventCandidates) {
    const scoredEventCandidates = eligibleCandidates
      .map((candidate) => scoredCandidateById.get(candidate.candidateId) ?? candidate)
      .sort((left, right) => (globalRankByCandidateId.get(left.candidateId) ?? Number.MAX_SAFE_INTEGER) - (globalRankByCandidateId.get(right.candidateId) ?? Number.MAX_SAFE_INTEGER));
    const selectedCandidates = scoredEventCandidates.slice(0, maxCandidatesPerEvent);
    for (const candidate of selectedCandidates) eventSelectedCandidateIds.add(candidate.candidateId);
    const omittedMarketCandidateCount = event.omittedMarkets.reduce((sum, market) => sum + (asNumber(market.candidateCount) ?? 0), 0);
    eventCandidateSummaries.push({
      eventSlug: event.eventSlug,
      seriesId: event.series.seriesId,
      seriesSlug: event.series.seriesSlug,
      eligibleMarketCount: event.eligibleMarketCount,
      selectedMarketCount: event.markets.length,
      omittedMarketCount: event.omittedMarkets.length,
      omittedMarkets: event.omittedMarkets,
      eligibleCandidateCount: eligibleCandidates.length,
      selectedCandidateCount: selectedCandidates.length,
      omittedCandidateCount: eligibleCandidates.length - selectedCandidates.length + omittedMarketCandidateCount,
      omittedMarketCandidateCount,
      omittedCandidateIds: scoredEventCandidates.slice(selectedCandidates.length).map((candidate) => candidate.candidateId),
      rankedCandidateIds: scoredEventCandidates.map((candidate) => candidate.candidateId),
      selectedCandidates,
    });
  }
  const seriesWatcherCounts = new Map();
  const seriesCappedCandidates = [];
  const seriesOmittedCandidateIds = [];
  for (const candidate of rankedCandidateUniverse) {
    if (!eventSelectedCandidateIds.has(candidate.candidateId)) continue;
    const currentCount = seriesWatcherCounts.get(candidate.event.series.seriesId) ?? 0;
    if (currentCount >= maxWatchersPerSeries) {
      seriesOmittedCandidateIds.push(candidate.candidateId);
      continue;
    }
    seriesWatcherCounts.set(candidate.event.series.seriesId, currentCount + 1);
    seriesCappedCandidates.push(candidate);
  }
  const globallyRankedSeriesCappedCandidates = seriesCappedCandidates.sort((left, right) => (globalRankByCandidateId.get(left.candidateId) ?? Number.MAX_SAFE_INTEGER) - (globalRankByCandidateId.get(right.candidateId) ?? Number.MAX_SAFE_INTEGER));
  const selectedCandidates = globallyRankedSeriesCappedCandidates.slice(0, maxWatchersTotal);
  const totalOmittedCandidateIds = globallyRankedSeriesCappedCandidates.slice(selectedCandidates.length).map((candidate) => candidate.candidateId);
  const candidates = selectedCandidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    seriesId: candidate.event.series.seriesId,
    seriesSlug: candidate.event.series.seriesSlug,
    eventSlug: candidate.event.eventSlug,
    marketSlug: candidate.market.slug,
    conditionId: candidate.market.conditionId,
    tokenId: candidate.tokenId,
    outcome: candidate.outcome,
    outcomeIndex: candidate.outcomeIndex,
    side: candidate.side,
    probability: candidate.probability,
    yesProbability: candidate.yesProbability,
    structTriggerProbability: candidate.structTriggerProbability,
    targetBondProbability: candidate.targetBondProbability,
    forecastEdge: candidate.forecastEdge,
    decisionDrivers: decisionDriversForCandidate(candidate),
    score: candidate.score,
    scorePartial: candidate.scorePartial,
    scoreVersion: candidate.scoreVersion,
    riskFlags: candidate.riskFlags,
    orderbookStatus: candidate.orderbookStatus,
    orderbookLookupRequested: candidate.orderbookLookupRequested,
    economics: candidate.economics,
  }));
  const watchers = selectedCandidates.map(buildWatcherPayload);
  const existing = await listManagedWatchers();
  const usedIds = new Set();
  const upserts = [];
  for (const watcher of watchers) {
    const existingPrompt = existing.find((prompt) => asString(prompt.name) === watcher.name);
    const toolInput = existingPrompt
      ? { promptId: asString(existingPrompt.id), name: watcher.name, target: watcher.target, condition: watcher.condition, ttl: watcher.ttl, expiresAt: watcher.ttl.expiresAt, resetRunCount: true, enabled: true }
      : { name: watcher.name, target: watcher.target, trigger: { type: "conditional", condition: watcher.condition }, ttl: watcher.ttl, metadata: watcher.metadata };
    const toolResult = existingPrompt ? await callTool("updateScheduledPromptCondition", toolInput) : await callTool("createScheduledPrompt", toolInput);
    const toolOk = readToolOk(toolResult);
    const promptId = asString(existingPrompt?.id) || readToolPromptId(toolResult);
    const ok = toolOk && Boolean(promptId);
    const error = readToolError(toolResult) || (toolOk && !promptId ? "Scheduled prompt result did not include a prompt id" : "");
    if (promptId) usedIds.add(promptId);
    upserts.push({ name: watcher.name, action: existingPrompt ? "updated" : "created", ok, promptId, ...(error ? { error } : {}) });
  }
  const deletes = [];
  for (const prompt of existing) {
    const promptId = asString(prompt.id);
    if (!promptId || usedIds.has(promptId)) continue;
    const deleted = await callTool("deleteScheduledPrompt", { promptId, confirmDelete: true });
    const ok = readToolOk(deleted);
    const error = readToolError(deleted);
    deletes.push({ promptId, ok, ...(error ? { error } : {}) });
  }
  const failedUpsertCount = upserts.filter((item) => item.ok === false).length;
  const failedDeleteCount = deletes.filter((item) => item.ok === false).length;
  const omittedMarketCount = eventCandidateSummaries.reduce((sum, item) => sum + item.omittedMarketCount, 0);
  const omittedMarketCandidateCount = eventCandidateSummaries.reduce((sum, item) => sum + (item.omittedMarketCandidateCount || 0), 0);
  const capSummary = { maxMarketsPerEvent, maxCandidatesPerEvent, maxWatchersPerSeries, maxWatchersTotal, eventCandidateSummaries: eventCandidateSummaries.map(({ selectedCandidates: _selectedCandidates, ...summary }) => summary), omittedMarketCount, omittedMarketCandidateCount, seriesOmittedCandidateIds, totalOmittedCandidateIds, omittedCandidateCount: eventCandidateSummaries.reduce((sum, item) => sum + item.omittedCandidateCount, 0) + seriesOmittedCandidateIds.length + totalOmittedCandidateIds.length };
  const rotatorOrderbookSummary = buildRotatorOrderbookSummary(rankedCandidateUniverse, orderbookBudget.reads);
  const state = { workflowId, runId: run.id, mode: "rotator", status: failedUpsertCount || failedDeleteCount ? "watchers_refresh_failed" : "watchers_refreshed", discoveryTool: "getSeriesMarket", marketSelectionMode, candidateScoreVersion, externalForecastFixtureCount: externalForecasts.length, seriesRegistry: registry, selectedEventCount: selectedEvents.length, selectedMarketCount: selectedEvents.reduce((sum, event) => sum + event.markets.length, 0), selectedCandidateCount: selectedCandidates.length, plannedWatcherCount: watchers.length, candidateSummary: candidates, capSummary, rotatorOrderbookSummary, createdCount: upserts.filter((item) => item.action === "created" && item.ok).length, updatedCount: upserts.filter((item) => item.action === "updated" && item.ok).length, deletedCount: deletes.filter((item) => item.ok).length, failedUpsertCount, failedDeleteCount, upserts, deletes };
  await writeState(state);
  return state;
};
const readPayload = () => {
  const data = asRecord(payload?.data);
  return { eventType: asString(payload?.eventType ?? payload?.event_type ?? payload?.event), webhookId: asString(payload?.webhookId ?? payload?.webhook_id) || "unknown-webhook", deduplicationId: asString(payload?.deduplicationId ?? payload?.deduplication_id) || stableHash(payload), conditionId: asString(data.conditionId ?? data.condition_id), tokenId: asString(data.tokenId ?? data.token_id ?? data.positionId ?? data.position_id), marketSlug: asString(data.marketSlug ?? data.market_slug ?? data.slug), eventSlug: asString(data.eventSlug ?? data.event_slug), outcome: asString(data.outcome ?? data.outcomeName ?? data.outcome_name), outcomeIndex: asNumber(data.outcomeIndex ?? data.outcome_index ?? data.positionOutcomeIndex ?? data.position_outcome_index), probability: asNumber(data.probability ?? data.price), raw: payload };
};
const findAllowedMarket = (info) => asArray(inputs.allowedMarkets).filter(isRecord).find((market) => {
  const hasConditionId = Boolean(info.conditionId);
  const hasMarketSlug = Boolean(info.marketSlug);
  const hasTokenId = Boolean(info.tokenId);
  const hasEventSlug = Boolean(info.eventSlug);
  if (!hasConditionId && !hasMarketSlug && !hasTokenId) return false;
  const conditionMatches = !hasConditionId || normalizeId(info.conditionId) === normalizeId(market.conditionId);
  const slugMatches = !hasMarketSlug || normalizeLabel(info.marketSlug) === normalizeLabel(market.marketSlug);
  const tokenMatches = !hasTokenId || asArray(market.outcomes).some((outcome) => normalizeId(outcome.tokenId) === normalizeId(info.tokenId));
  const eventMatches = !hasEventSlug || normalizeLabel(info.eventSlug) === normalizeLabel(market.eventSlug);
  return conditionMatches && slugMatches && tokenMatches && eventMatches;
});
const computeBuyFill = (asks, notional) => {
  const bestAsk = asks[0]?.price ?? null;
  if (bestAsk === null || bestAsk <= 0) return null;
  let remainingShares = notional / bestAsk;
  let totalCost = 0;
  let filledShares = 0;
  for (const level of asks) {
    const price = asNumber(level.price);
    const size = asNumber(level.size);
    if (price === null || size === null || price <= 0 || size <= 0) continue;
    const fillShares = Math.min(remainingShares, size);
    remainingShares -= fillShares;
    filledShares += fillShares;
    totalCost += fillShares * price;
    if (remainingShares <= 0) break;
  }
  return { bestAsk, filledShares, totalCost, averageFillPrice: filledShares > 0 ? totalCost / filledShares : 0, fullyFillable: remainingShares <= 0 && filledShares > 0 };
};
const parseTimestampMs = (value) => {
  const numeric = asNumber(value);
  if (numeric !== null) return numeric > 100000000000 ? numeric : numeric * 1000;
  const parsed = Date.parse(asString(value));
  return Number.isFinite(parsed) ? parsed : null;
};
const exposureSnapshot = async (seriesId) => {
  const dailyRows = await query("SELECT COALESCE(SUM(delta_notional_usd), 0) AS total FROM weather_bond_exposure_ledger WHERE created_at >= date('now')", []);
  const seriesRows = await query("SELECT COALESCE(SUM(delta_notional_usd), 0) AS total FROM weather_bond_exposure_ledger WHERE series_id = ? AND created_at >= date('now')", [seriesId]);
  const latchRows = await query("SELECT id FROM weather_bond_exposure_ledger WHERE reason = 'stop_after_first_auto' LIMIT 1", []);
  return { daily: asNumber(dailyRows[0]?.total) ?? 0, series: asNumber(seriesRows[0]?.total) ?? 0, latched: latchRows.length > 0 };
};
const buildExecutionProof = (plan) => {
  if (!isRecord(plan)) return { ok: true, status: "skipped", reason: "missing_plan" };
  const blocked = asString(plan.status) === "blocked";
  return { ok: !blocked, status: blocked ? "blocked" : "planned", reason: blocked ? "policy_blocked" : asString(plan.status), orderIntentId: asString(plan.orderIntentId), candidateId: asString(plan.candidateId), structDelivery: { conditionId: asString(plan.conditionId), tokenId: asString(plan.tokenId), probability: asNumber(plan.probability) } };
};
const executeWebhookTrade = async (plan) => {
  if (!isRecord(plan)) return { ok: true, status: "skipped", reason: "missing_plan" };
  const orderIntentId = asString(plan.orderIntentId);
  const baseProof = { orderIntentId, candidateId: asString(plan.candidateId), structDelivery: { conditionId: asString(plan.conditionId), tokenId: asString(plan.tokenId), probability: asNumber(plan.probability) } };
  if (plan.status === "blocked") return { ok: true, status: "blocked", reason: "policy_blocked", ...baseProof };
  if (plan.status === "dry_run") return { ok: true, status: "planned", reason: "dry_run", ...baseProof };
  if (plan.status !== "ready_to_trade") return { ok: true, status: "skipped", reason: "not_ready", planStatus: asString(plan.status), ...baseProof };
  const existingRows = await query("SELECT status, external_order_id FROM weather_bond_order_intents WHERE id = ? LIMIT 1", [orderIntentId]);
  const existingStatus = asString(existingRows[0]?.status);
  if (["submitting", "submitted", "failed"].includes(existingStatus)) {
    return { ok: true, status: "skipped", reason: "order_intent_terminal", existingStatus, externalOrderId: asString(existingRows[0]?.external_order_id) || null, ...baseProof };
  }
  const amount = Math.min(asNumber(plan.notionalUsd) ?? 0, maxTradeNotionalUsd);
  const tradeRequest = { marketId: asString(plan.marketSlug), outcome: asString(plan.outcome), side: "buy", amount, maxSlippage, executionMode: "full_immediate_fill" };
  if (!tradeRequest.marketId || !tradeRequest.outcome || amount <= 0) return { ok: false, status: "blocked", reason: "invalid_trade_request", ...baseProof, tradeRequest };
  await query("UPDATE weather_bond_order_intents SET status = ?, intent_json = ?, updated_at = ? WHERE id = ?", ["submitting", JSON.stringify({ plan, tradeRequest }), nowIso(), orderIntentId]);
  let rawTradeResult = null;
  try {
    rawTradeResult = await callTool("tradePredictionMarket", tradeRequest);
  } catch (error) {
    const tradeError = { message: error instanceof Error ? error.message : String(error) };
    await query("UPDATE weather_bond_order_intents SET status = ?, intent_json = ?, updated_at = ? WHERE id = ?", ["failed", JSON.stringify({ plan, tradeRequest, tradeError }), nowIso(), orderIntentId]);
    return { ok: false, status: "failed", reason: "trade_tool_error", ...baseProof, tradeRequest, tradeError };
  }
  const tradeResult = isRecord(rawTradeResult?.result) ? rawTradeResult.result : rawTradeResult;
  const order = isRecord(tradeResult?.order) ? tradeResult.order : {};
  const submitted = tradeResult?.type === "PREDICTION_TRADE_SUCCESS";
  const externalOrderId = asString(order.orderId ?? order.id ?? tradeResult?.orderId);
  await query("UPDATE weather_bond_order_intents SET status = ?, external_order_id = ?, intent_json = ?, updated_at = ? WHERE id = ?", [submitted ? "submitted" : "failed", externalOrderId || null, JSON.stringify({ plan, tradeRequest, tradeResult }), nowIso(), orderIntentId]);
  if (submitted) {
    await query("INSERT INTO weather_bond_exposure_ledger (id, order_intent_id, series_id, delta_notional_usd, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)", ["weather_exposure_" + asString(plan.planHash), orderIntentId, asString(plan.seriesId), amount, stopAfterFirstAuto ? "stop_after_first_auto" : "webhook_trade_submit", nowIso()]);
  }
  return { ok: submitted, status: submitted ? "submitted" : "failed", reason: submitted ? "trade_submitted" : "trade_failed", ...baseProof, tradeRequest, tradeResult: { type: tradeResult?.type ?? null, order: { orderId: externalOrderId || null, status: asString(order.status) || null, filledShares: asNumber(order.filledShares), averagePrice: asNumber(order.averagePrice), remainingShares: asNumber(order.remainingShares) } } };
};
const runWebhook = async () => {
  await ensureTables();
  if (!payload) return writeSkip("missing_webhook_payload", {});
  const info = readPayload();
  if (info.eventType !== "close_to_bond") return writeSkip("unsupported_event_type", { eventType: info.eventType });
  if (info.probability === null) return writeSkip("missing_probability", info);
  const expectedOutcomeIndex = asNumber(inputs.expectedOutcomeIndex);
  const expectedOutcome = asString(inputs.expectedOutcome);
  if (expectedOutcomeIndex !== null && info.outcomeIndex !== expectedOutcomeIndex) return writeSkip("identity_outcome_index_mismatch", { expectedOutcomeIndex, info });
  if (expectedOutcome && info.outcome && normalizeLabel(info.outcome) !== normalizeLabel(expectedOutcome)) return writeSkip("identity_outcome_mismatch", { expectedOutcome, info });
  const isNo = info.outcomeIndex === 1 || normalizeLabel(info.outcome) === "no";
  const side = isNo ? "no" : "yes";
  const targetBondProbability = isNo ? 1 - info.probability : info.probability;
  if (!isNo && info.probability < minProbability) return writeSkip("below_min_probability", info);
  if (isNo && info.probability > maxNoProbability) return writeSkip("above_max_no_probability", info);
  const allowedMarket = findAllowedMarket(info);
  if (!allowedMarket) return writeSkip("no_eligible_candidate", info);
  const selectedOutcome = asArray(allowedMarket.outcomes).find((outcome) => asNumber(outcome.index) === (isNo ? 1 : 0));
  const tokenId = info.tokenId || asString(selectedOutcome?.tokenId);
  if (!tokenId) return writeSkip("missing_token_ids", info);
  const candidateOutcomeIndex = asNumber(selectedOutcome?.index) ?? (isNo ? 1 : 0);
  const candidateId = asString(inputs.candidateId) || "weather_candidate_" + stableHash({ seriesId: asString(allowedMarket.seriesId), eventSlug: asString(allowedMarket.eventSlug), conditionId: asString(allowedMarket.conditionId), tokenId, outcomeIndex: candidateOutcomeIndex });
  const claimId = "weather_claim_" + stableHash({ webhookId: info.webhookId, deduplicationId: info.deduplicationId });
  await query("INSERT OR IGNORE INTO weather_bond_delivery_claims (id, run_id, webhook_id, deduplication_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)", [claimId, run.id, info.webhookId, info.deduplicationId, JSON.stringify(payload), nowIso()]);
  const claimedRows = await query("SELECT run_id FROM weather_bond_delivery_claims WHERE id = ? LIMIT 1", [claimId]);
  const claimOwnerRunId = asString(claimedRows[0]?.run_id);
  if (claimOwnerRunId !== asString(run.id)) return writeSkip("duplicate_delivery", { claimId, webhookId: info.webhookId, deduplicationId: info.deduplicationId, claimOwnerRunId });
  const exactInput = { identifiers: { marketSlug: asString(allowedMarket.marketSlug), conditionId: asString(allowedMarket.conditionId), positionId: tokenId }, selectors: { outcome: asString(selectedOutcome?.name) || (isNo ? "No" : "Yes"), outcomeIndex: isNo ? 1 : 0 }, options: { activeOnly: true } };
  const exact = await callTool("resolvePredictionMarketExact", exactInput);
  if (exact?.type !== "PREDICTION_MARKET_EXACT_SUCCESS") return writeSkip("unresolved_exact_market", { exactInput, exact });
  const resolvedMarket = asRecord(exact.resolvedMarket);
  const resolvedOutcome = asRecord(exact.resolvedOutcome);
  if (normalizeId(resolvedMarket.conditionId) !== normalizeId(allowedMarket.conditionId)) return writeSkip("identity_condition_mismatch", { exact });
  if (normalizeId(resolvedOutcome.tokenId) !== normalizeId(tokenId)) return writeSkip("identity_token_mismatch", { exact });
  const orderbook = await callTool("getPredictionOrderbook", { tokenId, levels: 50, slippageSizes: [1, 5, 10] });
  if (orderbook?.type !== "PREDICTION_ORDERBOOK_SUCCESS") return writeSkip("orderbook_lookup_failed", { exact, orderbook });
  const timestampMs = parseTimestampMs(orderbook.timestamp);
  const ageMs = timestampMs !== null ? Date.now() - timestampMs : Number.POSITIVE_INFINITY;
  const asks = asArray(orderbook.asks).map(asRecord);
  const bids = asArray(orderbook.bids).map(asRecord);
  const bestBid = asNumber(bids[0]?.price);
  const fill = computeBuyFill(asks, notionalUsd);
  const spread = fill && bestBid !== null ? fill.bestAsk - bestBid : null;
  if (ageMs < 0 || ageMs > maxOrderbookAgeMs) return writeSkip("stale_orderbook", { ageMs, maxOrderbookAgeMs, exact, orderbook });
  if (!fill || !fill.fullyFillable) return writeSkip("insufficient_fill_liquidity", { fill, exact, orderbook });
  if (spread === null || spread < 0 || spread > maxSpread) return writeSkip("spread_too_wide", { spread, maxSpread, fill, exact, orderbook });
  if (fill.averageFillPrice - fill.bestAsk > maxSlippage) return writeSkip("slippage_too_high", { fill, maxSlippage, exact, orderbook });
  const limitPrice = Math.min(0.99, targetBondProbability + limitPriceOffset);
  if (fill.bestAsk > limitPrice) return writeSkip("ask_above_limit_price", { bestAsk: fill.bestAsk, limitPrice, fill, exact, orderbook });
  const idempotencyKey = "weather_bond_" + stableHash({ conditionId: allowedMarket.conditionId, tokenId, side, webhookId: info.webhookId, deduplicationId: info.deduplicationId });
  const planHash = stableHash({ idempotencyKey, notionalUsd, limitPrice, maxSpread, maxSlippage, maxOrderbookAgeMs });
  const orderIntentId = "weather_intent_" + planHash;
  const exposure = await exposureSnapshot(asString(allowedMarket.seriesId));
  const skipReasons = [];
  if (exposure.latched && stopAfterFirstAuto) skipReasons.push("stop_after_first_latched");
  if (notionalUsd > maxTradeNotionalUsd && !dryRun) skipReasons.push("max_trade_notional_exceeded");
  if (exposure.daily + notionalUsd > maxDailyNotionalUsd && !dryRun) skipReasons.push("max_daily_notional_exceeded");
  if (exposure.series + notionalUsd > maxPerSeriesDailyNotionalUsd && !dryRun) skipReasons.push("max_per_series_daily_notional_exceeded");
  const status = dryRun ? "dry_run" : skipReasons.length > 0 ? "blocked" : "ready_to_trade";
  const buyCostUsd = fill.totalCost;
  const expectedPayoutUsd = fill.filledShares * targetBondProbability;
  const pnl = { buyCostUsd, sharesAcquired: fill.filledShares, expectedPayoutUsd, bondPayoutIfWinsUsd: fill.filledShares, feesUsd: 0, slippageUsd: (fill.averageFillPrice - fill.bestAsk) * fill.filledShares, estimatedPnlUsd: expectedPayoutUsd - buyCostUsd, liveDryRunPotentialPnlUsd: fill.filledShares - buyCostUsd, settledPnlUsd: null };
  const intent = { orderIntentId, candidateId, idempotencyKey, planHash, dryRun, status, marketSelectionMode, candidateScoreVersion, seriesId: asString(allowedMarket.seriesId), seriesSlug: asString(allowedMarket.seriesSlug), eventSlug: asString(allowedMarket.eventSlug), marketSlug: asString(allowedMarket.marketSlug), conditionId: asString(allowedMarket.conditionId), tokenId, outcome: asString(selectedOutcome?.name) || (isNo ? "No" : "Yes"), outcomeIndex: candidateOutcomeIndex, side, probability: info.probability, targetBondProbability, notionalUsd, limitPrice, fill, pnl, skipReasons, exactInput };
  const existingIntentRows = await query("SELECT status, external_order_id FROM weather_bond_order_intents WHERE id = ? LIMIT 1", [orderIntentId]);
  const existingIntentStatus = asString(existingIntentRows[0]?.status);
  if (["submitting", "submitted", "failed"].includes(existingIntentStatus)) return writeSkip("order_intent_terminal", { orderIntentId, existingStatus: existingIntentStatus, externalOrderId: asString(existingIntentRows[0]?.external_order_id) || null });
  await query("INSERT OR IGNORE INTO weather_bond_candidates (id, series_id, series_slug, event_slug, market_slug, condition_id, token_id, side, probability, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [candidateId, intent.seriesId, intent.seriesSlug, intent.eventSlug, intent.marketSlug, intent.conditionId, tokenId, side, info.probability, JSON.stringify(payload), nowIso()]);
  await query("INSERT OR IGNORE INTO weather_bond_plans (id, candidate_id, plan_hash, plan_json, created_at) VALUES (?, ?, ?, ?, ?)", ["weather_plan_" + planHash, candidateId, planHash, JSON.stringify(intent), nowIso()]);
  await query("INSERT OR IGNORE INTO weather_bond_order_intents (id, candidate_id, idempotency_key, status, intent_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [orderIntentId, candidateId, idempotencyKey, status, JSON.stringify(intent), nowIso(), nowIso()]);
  await query("UPDATE weather_bond_order_intents SET status = ?, intent_json = ?, updated_at = ? WHERE id = ?", [status, JSON.stringify(intent), nowIso(), orderIntentId]);
  const executionProof = dryRun || status === "blocked" ? buildExecutionProof(intent) : await executeWebhookTrade(intent);
  const corpus = { capturedAtIso: nowIso(), payload, allowedMarket, exact, orderbook, intent, executionProof };
  await fs.promises.writeFile(liveCorpusFile, JSON.stringify(corpus, null, 2), "utf-8");
  const state = { workflowId, runId: run.id, mode: "webhook", ...intent, executionProof };
  await writeState(state);
  return state;
};
return mode === "webhook" ? runWebhook() : runRotator();
})();
return result;
`,
    },
  ],
});
