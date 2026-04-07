import defineWorkflow from "/workspace/tools/workflow/defineWorkflow";

export default defineWorkflow({
  version: 1,
  id: "nba-matchup-edge-report",
  name: "NBA Matchup Edge Report",
  description:
    "Evaluates today's NBA matchups from public sources and writes a transparent edge-rating markdown report in clear workflow phases.",
  steps: [
    {
      id: "fetch_schedule",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const SCHEDULE_URL = "https://www.espn.com/nba/schedule";
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=" +
  new Date().toISOString().slice(0, 10).replace(/-/g, "");

const TEAM_NAME_ALIASES = {
  "Atlanta Hawks": "Atlanta Hawks",
  "Boston Celtics": "Boston Celtics",
  "Brooklyn Nets": "Brooklyn Nets",
  "Charlotte Hornets": "Charlotte Hornets",
  "Chicago Bulls": "Chicago Bulls",
  "Cleveland Cavaliers": "Cleveland Cavaliers",
  "Dallas Mavericks": "Dallas Mavericks",
  "Denver Nuggets": "Denver Nuggets",
  "Detroit Pistons": "Detroit Pistons",
  "Golden State Warriors": "Golden State Warriors",
  "Houston Rockets": "Houston Rockets",
  "Indiana Pacers": "Indiana Pacers",
  "LA Clippers": "LA Clippers",
  "Los Angeles Clippers": "LA Clippers",
  "Los Angeles Lakers": "Los Angeles Lakers",
  "Memphis Grizzlies": "Memphis Grizzlies",
  "Miami Heat": "Miami Heat",
  "Milwaukee Bucks": "Milwaukee Bucks",
  "Minnesota Timberwolves": "Minnesota Timberwolves",
  "New Orleans Pelicans": "New Orleans Pelicans",
  "New York Knicks": "New York Knicks",
  "Oklahoma City Thunder": "Oklahoma City Thunder",
  "Orlando Magic": "Orlando Magic",
  "Philadelphia 76ers": "Philadelphia 76ers",
  "Phoenix Suns": "Phoenix Suns",
  "Portland Trail Blazers": "Portland Trail Blazers",
  "Sacramento Kings": "Sacramento Kings",
  "San Antonio Spurs": "San Antonio Spurs",
  "Toronto Raptors": "Toronto Raptors",
  "Utah Jazz": "Utah Jazz",
  "Washington Wizards": "Washington Wizards",
  Suns: "Phoenix Suns",
  Magic: "Orlando Magic",
  Hornets: "Charlotte Hornets",
  Nets: "Brooklyn Nets",
  Raptors: "Toronto Raptors",
  Pistons: "Detroit Pistons",
  Knicks: "New York Knicks",
  Rockets: "Houston Rockets",
  Mavericks: "Dallas Mavericks",
  Bucks: "Milwaukee Bucks",
  Cavaliers: "Cleveland Cavaliers",
  Lakers: "Los Angeles Lakers",
  Clippers: "LA Clippers",
  "Trail Blazers": "Portland Trail Blazers",
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeTeamName(name) {
  const cleaned = String(name || "")
    .replace(/\[\]\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_NAME_ALIASES[cleaned] || cleaned;
}

function parseJsonPayload(text) {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(text.slice(objectStart, objectEnd + 1));
  }
  throw new Error("Could not locate JSON payload in fetched content.");
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

const exactScheduleText = await fetchText(SCHEDULE_URL);
const scoreboardText = await fetchText(SCOREBOARD_URL);
const payload = parseJsonPayload(scoreboardText);
const events = Array.isArray(payload?.events) ? payload.events : [];

const games = events
  .map((event) => {
    const competitors = event?.competitions?.[0]?.competitors || [];
    const away = competitors.find((item) => item?.homeAway === "away");
    const home = competitors.find((item) => item?.homeAway === "home");
    const awayName = normalizeTeamName(away?.team?.displayName);
    const homeName = normalizeTeamName(home?.team?.displayName);
    if (!awayName || !homeName) {
      return null;
    }
    return {
      matchup: awayName + " at " + homeName,
      away: awayName,
      home: homeName,
      awayId: String(away?.team?.id || ""),
      homeId: String(home?.team?.id || ""),
      awayAbbr: String(away?.team?.abbreviation || "").toUpperCase(),
      homeAbbr: String(home?.team?.abbreviation || "").toUpperCase(),
    };
  })
  .filter(Boolean);

if (!games.length) {
  throw new Error("No games found for today's NBA slate.");
}

export default {
  games,
  sourceRows: [
    {
      dataCategory: "Schedule",
      sourceUsed: "ESPN NBA Schedule",
      sourceUrl: SCHEDULE_URL,
      fetchTime: nowIso(),
      substitutions: "",
    },
    {
      dataCategory: "Schedule",
      sourceUsed: "ESPN Scoreboard API",
      sourceUrl: SCOREBOARD_URL,
      fetchTime: nowIso(),
      substitutions:
        "Used as a public supplemental source to identify today's games after fetching the exact schedule URL first.",
    },
  ],
  diagnostics: {
    scheduleTextLength: exactScheduleText.length,
    gameCount: games.length,
  },
};
`,
    },
    {
      id: "fetch_overall_strength",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const REQUESTED_URL = "https://www.nba.com/stats/teams";
const FALLBACK_URL =
  "https://www.basketball-reference.com/leagues/NBA_2026_ratings.html";
const SECONDARY_FALLBACK_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=" +
  new Date().toISOString().slice(0, 10).replace(/-/g, "");

const TEAM_NAME_ALIASES = {
  "Atlanta Hawks": "Atlanta Hawks",
  "Boston Celtics": "Boston Celtics",
  "Brooklyn Nets": "Brooklyn Nets",
  "Charlotte Hornets": "Charlotte Hornets",
  "Chicago Bulls": "Chicago Bulls",
  "Cleveland Cavaliers": "Cleveland Cavaliers",
  "Dallas Mavericks": "Dallas Mavericks",
  "Denver Nuggets": "Denver Nuggets",
  "Detroit Pistons": "Detroit Pistons",
  "Golden State Warriors": "Golden State Warriors",
  "Houston Rockets": "Houston Rockets",
  "Indiana Pacers": "Indiana Pacers",
  "LA Clippers": "LA Clippers",
  "Los Angeles Clippers": "LA Clippers",
  "Los Angeles Lakers": "Los Angeles Lakers",
  "Memphis Grizzlies": "Memphis Grizzlies",
  "Miami Heat": "Miami Heat",
  "Milwaukee Bucks": "Milwaukee Bucks",
  "Minnesota Timberwolves": "Minnesota Timberwolves",
  "New Orleans Pelicans": "New Orleans Pelicans",
  "New York Knicks": "New York Knicks",
  "Oklahoma City Thunder": "Oklahoma City Thunder",
  "Orlando Magic": "Orlando Magic",
  "Philadelphia 76ers": "Philadelphia 76ers",
  "Phoenix Suns": "Phoenix Suns",
  "Portland Trail Blazers": "Portland Trail Blazers",
  "Sacramento Kings": "Sacramento Kings",
  "San Antonio Spurs": "San Antonio Spurs",
  "Toronto Raptors": "Toronto Raptors",
  "Utah Jazz": "Utah Jazz",
  "Washington Wizards": "Washington Wizards",
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeTeamName(name) {
  const cleaned = String(name || "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_NAME_ALIASES[cleaned] || cleaned;
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

function parseJsonPayload(text) {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(text.slice(objectStart, objectEnd + 1));
  }
  throw new Error("Could not locate JSON payload in fetched content.");
}

function parseRecordSummary(summary) {
  const match = String(summary || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const totalGames = wins + losses;
  if (!Number.isFinite(wins) || !Number.isFinite(losses) || totalGames <= 0) {
    return null;
  }
  return (wins / totalGames) * 100;
}

const sourceRows = [];
let records = [];

let requestedText = "";
try {
  requestedText = await fetchText(REQUESTED_URL);
} catch (_error) {
  requestedText = "";
}
sourceRows.push({
  dataCategory: "Overall team strength",
  sourceUsed: "NBA Stats Teams",
  sourceUrl: REQUESTED_URL,
  fetchTime: nowIso(),
  substitutions: requestedText
    ? "Fetched first as requested, but not used because it was not retrieved as a reliable full team table in this runtime."
    : "Fetched first as requested, but it was not retrieved reliably in this runtime.",
});

try {
  const fallbackText = await fetchText(FALLBACK_URL);
  for (const line of fallbackText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 15) continue;
    if (cells[0] === "Rk" || cells[0] === "---") continue;
    const team = normalizeTeamName(cells[1]);
    const value = Number.parseFloat(cells[cells.length - 1]);
    if (team && Number.isFinite(value)) {
      records.push({ team, value });
    }
  }
  sourceRows.push({
    dataCategory: "Overall team strength",
    sourceUsed: "Basketball Reference Team Ratings",
    sourceUrl: FALLBACK_URL,
    fetchTime: nowIso(),
    substitutions:
      records.length > 0
        ? "Substitution used because https://www.nba.com/stats/teams was not retrieved reliably as a full team table."
        : "Attempted substitution, but no reliable team ratings table was parsed from the fetched content.",
  });
} catch (_error) {
  sourceRows.push({
    dataCategory: "Overall team strength",
    sourceUsed: "Basketball Reference Team Ratings",
    sourceUrl: FALLBACK_URL,
    fetchTime: nowIso(),
    substitutions:
      "Attempted substitution, but Basketball Reference could not be retrieved reliably in this runtime.",
  });
}

if (!records.length) {
  try {
    const scoreboardText = await fetchText(SECONDARY_FALLBACK_URL);
    const payload = parseJsonPayload(scoreboardText);
    const events = Array.isArray(payload?.events) ? payload.events : [];
    const seen = new Set();

    for (const event of events) {
      const competitors = event?.competitions?.[0]?.competitors || [];
      for (const competitor of competitors) {
        const team = normalizeTeamName(competitor?.team?.displayName);
        const recordSummary =
          competitor?.records?.find((item) => item?.name === "overall")?.summary ||
          competitor?.records?.[0]?.summary ||
          "";
        const value = parseRecordSummary(recordSummary);
        if (!team || !Number.isFinite(value) || seen.has(team)) {
          continue;
        }
        seen.add(team);
        records.push({ team, value });
      }
    }

    sourceRows.push({
      dataCategory: "Overall team strength",
      sourceUsed: "ESPN Scoreboard API Team Records",
      sourceUrl: SECONDARY_FALLBACK_URL,
      fetchTime: nowIso(),
      substitutions:
        records.length > 0
          ? "Second substitution used because https://www.nba.com/stats/teams was not retrieved reliably as a full team table and Basketball Reference could not be retrieved reliably."
          : "Attempted second substitution, but no usable team records were parsed from the ESPN scoreboard payload.",
    });
  } catch (_error) {
    sourceRows.push({
      dataCategory: "Overall team strength",
      sourceUsed: "ESPN Scoreboard API Team Records",
      sourceUrl: SECONDARY_FALLBACK_URL,
      fetchTime: nowIso(),
      substitutions:
        "Attempted second substitution, but the ESPN scoreboard payload could not be retrieved reliably in this runtime.",
    });
  }
}

export default {
  records,
  sourceRows,
  unavailableReason: records.length
    ? ""
    : "Overall team strength unavailable after trying NBA Stats Teams, Basketball Reference Team Ratings, and ESPN Scoreboard API team records.",
};
`,
    },
    {
      id: "fetch_recent_form",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const RECENT_FORM_URL =
  "https://www.teamrankings.com/nba/ranking/last-5-games-by-other";

const TEAM_NAME_ALIASES = {
  Atlanta: "Atlanta Hawks",
  Boston: "Boston Celtics",
  Brooklyn: "Brooklyn Nets",
  Charlotte: "Charlotte Hornets",
  Chicago: "Chicago Bulls",
  Cleveland: "Cleveland Cavaliers",
  Dallas: "Dallas Mavericks",
  Denver: "Denver Nuggets",
  Detroit: "Detroit Pistons",
  "Golden State": "Golden State Warriors",
  Houston: "Houston Rockets",
  Indiana: "Indiana Pacers",
  "LA Clippers": "LA Clippers",
  "LA Lakers": "Los Angeles Lakers",
  Memphis: "Memphis Grizzlies",
  Miami: "Miami Heat",
  Milwaukee: "Milwaukee Bucks",
  Minnesota: "Minnesota Timberwolves",
  "New Orleans": "New Orleans Pelicans",
  "New York": "New York Knicks",
  "Okla City": "Oklahoma City Thunder",
  Orlando: "Orlando Magic",
  Philadelphia: "Philadelphia 76ers",
  Phoenix: "Phoenix Suns",
  Portland: "Portland Trail Blazers",
  Sacramento: "Sacramento Kings",
  "San Antonio": "San Antonio Spurs",
  Toronto: "Toronto Raptors",
  Utah: "Utah Jazz",
  Washington: "Washington Wizards",
};

function nowIso() {
  return new Date().toISOString();
}

function unwrapStep(step) {
  return step?.result?.result ?? step?.result ?? {};
}

function normalizeTeamName(name) {
  const cleaned = String(name || "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\(\d+-\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^\d+$/.test(cleaned)) {
    return "";
  }
  return TEAM_NAME_ALIASES[cleaned] || cleaned;
}

function parseJsonPayload(text) {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(text.slice(objectStart, objectEnd + 1));
  }
  throw new Error("Could not locate JSON payload in fetched content.");
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

const schedule = unwrapStep(steps.fetch_schedule);
const sourceRows = [];
let records = [];

try {
  const teamRankingsText = await fetchText(RECENT_FORM_URL);
  if (/SecurityCompromiseError|DDoS attack suspected|Anonymous access to domain/i.test(teamRankingsText)) {
    throw new Error("TeamRankings blocked");
  }

 for (const line of teamRankingsText.split("\n")) {
   const trimmed = line.trim();
   if (!trimmed.startsWith("|")) continue;
   const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 6) continue;
    const rank = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rank) || rank < 1 || rank > 30) continue;
    const team = normalizeTeamName(cells[1]);
    const value = Number.parseFloat(cells[2]);
    if (team && Number.isFinite(value)) {
      records.push({ team, value });
    }
  }

  if (records.length < 20) {
   throw new Error("TeamRankings table could not be parsed reliably");
  }

  sourceRows.push({
    dataCategory: "Recent form",
    sourceUsed: "TeamRankings Last 5 Games By Other",
    sourceUrl: RECENT_FORM_URL,
    fetchTime: nowIso(),
    substitutions: "",
  });
} catch {
  const uniqueTeams = [];
  const seen = new Set();
  for (const game of schedule.games || []) {
    for (const team of [
      { team: game.away, teamId: game.awayId },
      { team: game.home, teamId: game.homeId },
    ]) {
      if (team.team && team.teamId && !seen.has(team.team)) {
        seen.add(team.team);
        uniqueTeams.push(team);
      }
    }
  }

  records = [];
  for (const team of uniqueTeams) {
    const url =
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/" +
      team.teamId +
      "/schedule?seasontype=2";
    try {
      const text = await fetchText(url);
      const payload = parseJsonPayload(text);
      const events = Array.isArray(payload?.events) ? payload.events : [];
      const completed = events
        .filter((event) => event?.competitions?.[0]?.status?.type?.completed === true)
        .map((event) => {
          const competitors = event?.competitions?.[0]?.competitors || [];
          const self = competitors.find((item) => String(item?.team?.id || "") === String(team.teamId));
          const opp = competitors.find((item) => String(item?.team?.id || "") !== String(team.teamId));
          const selfScore = Number(self?.score?.value ?? self?.score ?? 0);
          const oppScore = Number(opp?.score?.value ?? opp?.score ?? 0);
          return {
            date: Date.parse(String(event?.date || "")) || 0,
            margin: selfScore - oppScore,
          };
        })
        .filter((item) => Number.isFinite(item.margin) && item.date > 0)
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);

      if (completed.length > 0) {
        const avgMargin =
          completed.reduce((sum, item) => sum + item.margin, 0) / completed.length;
        records.push({ team: team.team, value: avgMargin });
      }
    } catch {
      // Leave the team missing if the schedule endpoint fails.
    }
  }

  sourceRows.push({
    dataCategory: "Recent form",
    sourceUsed: "ESPN team schedule results",
    sourceUrl: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{teamId}/schedule?seasontype=2",
    fetchTime: nowIso(),
    substitutions:
      "Derived recent form from each team's last five completed public ESPN game results because the requested TeamRankings source was not retrieved reliably.",
  });
}

export default {
  records,
  sourceRows,
};
`,
    },
    {
      id: "fetch_four_factors",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const FOUR_FACTORS_URL = "https://www.nba.com/stats/teams/four-factors";

const TEAM_NAME_ALIASES = {
  "Atlanta Hawks": "Atlanta Hawks",
  "Boston Celtics": "Boston Celtics",
  "Brooklyn Nets": "Brooklyn Nets",
  "Charlotte Hornets": "Charlotte Hornets",
  "Chicago Bulls": "Chicago Bulls",
  "Cleveland Cavaliers": "Cleveland Cavaliers",
  "Dallas Mavericks": "Dallas Mavericks",
  "Denver Nuggets": "Denver Nuggets",
  "Detroit Pistons": "Detroit Pistons",
  "Golden State Warriors": "Golden State Warriors",
  "Houston Rockets": "Houston Rockets",
  "Indiana Pacers": "Indiana Pacers",
  "LA Clippers": "LA Clippers",
  "Los Angeles Clippers": "LA Clippers",
  "Los Angeles Lakers": "Los Angeles Lakers",
  "Memphis Grizzlies": "Memphis Grizzlies",
  "Miami Heat": "Miami Heat",
  "Milwaukee Bucks": "Milwaukee Bucks",
  "Minnesota Timberwolves": "Minnesota Timberwolves",
  "New Orleans Pelicans": "New Orleans Pelicans",
  "New York Knicks": "New York Knicks",
  "Oklahoma City Thunder": "Oklahoma City Thunder",
  "Orlando Magic": "Orlando Magic",
  "Philadelphia 76ers": "Philadelphia 76ers",
  "Phoenix Suns": "Phoenix Suns",
  "Portland Trail Blazers": "Portland Trail Blazers",
  "Sacramento Kings": "Sacramento Kings",
  "San Antonio Spurs": "San Antonio Spurs",
  "Toronto Raptors": "Toronto Raptors",
  "Utah Jazz": "Utah Jazz",
  "Washington Wizards": "Washington Wizards",
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeTeamName(name) {
  const cleaned = String(name || "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_NAME_ALIASES[cleaned] || cleaned;
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

let records = [];
let substitutions = "";
let sourceUsed = "NBA Stats Four Factors";
try {
  const text = await fetchText(FOUR_FACTORS_URL);
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 15) continue;
    if (cells[1] === "Team" || cells[0] === "---") continue;

    const team = normalizeTeamName(cells[1]);
    const efg = Number.parseFloat(cells[7]);
    const ftaRate = Number.parseFloat(cells[8]);
    const tov = Number.parseFloat(cells[9]);
    const oreb = Number.parseFloat(cells[10]);
    const oppEfg = Number.parseFloat(cells[11]);
    const oppFtaRate = Number.parseFloat(cells[12]);
    const oppTov = Number.parseFloat(cells[13]);
    const oppOreb = Number.parseFloat(cells[14]);
    if (
      !team ||
      ![efg, ftaRate, tov, oreb, oppEfg, oppFtaRate, oppTov, oppOreb].every(
        Number.isFinite,
      )
    ) {
      continue;
    }

    const value =
      (efg - oppEfg) * 1.5 +
      (ftaRate - oppFtaRate) * 10 +
      (oppTov - tov) * 0.8 +
      (oreb - oppOreb) * 0.5;
    records.push({ team, value });
  }

  if (records.length < 20) {
    throw new Error("Four factors table could not be parsed reliably");
  }
} catch {
  sourceUsed = "Unavailable";
  substitutions =
    "Requested four factors page could not be parsed reliably in this runtime.";
}

export default {
  records,
  sourceRows: [
    {
      dataCategory: "Four factors",
      sourceUsed,
      sourceUrl: FOUR_FACTORS_URL,
      fetchTime: nowIso(),
      substitutions: substitutions || "None",
    },
  ],
  unavailableReason: records.length
    ? ""
    : "Four factors unavailable after attempting the requested NBA Stats page.",
};
`,
    },
    {
      id: "fetch_defense",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const DEFENSE_URL = "https://www.nba.com/stats/teams/opponent-shooting";

const TEAM_NAME_ALIASES = {
  "Atlanta Hawks": "Atlanta Hawks",
  "Boston Celtics": "Boston Celtics",
  "Brooklyn Nets": "Brooklyn Nets",
  "Charlotte Hornets": "Charlotte Hornets",
  "Chicago Bulls": "Chicago Bulls",
  "Cleveland Cavaliers": "Cleveland Cavaliers",
  "Dallas Mavericks": "Dallas Mavericks",
  "Denver Nuggets": "Denver Nuggets",
  "Detroit Pistons": "Detroit Pistons",
  "Golden State Warriors": "Golden State Warriors",
  "Houston Rockets": "Houston Rockets",
  "Indiana Pacers": "Indiana Pacers",
  "LA Clippers": "LA Clippers",
  "Los Angeles Clippers": "LA Clippers",
  "Los Angeles Lakers": "Los Angeles Lakers",
  "Memphis Grizzlies": "Memphis Grizzlies",
  "Miami Heat": "Miami Heat",
  "Milwaukee Bucks": "Milwaukee Bucks",
  "Minnesota Timberwolves": "Minnesota Timberwolves",
  "New Orleans Pelicans": "New Orleans Pelicans",
  "New York Knicks": "New York Knicks",
  "Oklahoma City Thunder": "Oklahoma City Thunder",
  "Orlando Magic": "Orlando Magic",
  "Philadelphia 76ers": "Philadelphia 76ers",
  "Phoenix Suns": "Phoenix Suns",
  "Portland Trail Blazers": "Portland Trail Blazers",
  "Sacramento Kings": "Sacramento Kings",
  "San Antonio Spurs": "San Antonio Spurs",
  "Toronto Raptors": "Toronto Raptors",
  "Utah Jazz": "Utah Jazz",
  "Washington Wizards": "Washington Wizards",
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeTeamName(name) {
  const cleaned = String(name || "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_NAME_ALIASES[cleaned] || cleaned;
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

let records = [];
let substitutions = "";
let sourceUsed = "NBA Stats Opponent Shooting";
try {
  const text = await fetchText(DEFENSE_URL);
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 19) continue;
    if (cells[0] === "Team" || cells[0] === "---") continue;

    const team = normalizeTeamName(cells[0]);
    const fgmValues = [cells[1], cells[4], cells[7], cells[10], cells[13], cells[16]].map((cell) =>
      Number.parseFloat(cell),
    );
    const fgaValues = [cells[2], cells[5], cells[8], cells[11], cells[14], cells[17]].map((cell) =>
      Number.parseFloat(cell),
    );
    if (!team || !fgmValues.every(Number.isFinite) || !fgaValues.every(Number.isFinite)) {
      continue;
    }

    const totalFgm = fgmValues.reduce((sum, value) => sum + value, 0);
    const totalFga = fgaValues.reduce((sum, value) => sum + value, 0);
    if (!(totalFga > 0)) continue;

    const value = (totalFgm / totalFga) * 100;
    records.push({ team, value });
  }

  if (records.length < 20) {
    throw new Error("Opponent shooting table could not be parsed reliably");
  }
} catch {
  sourceUsed = "Unavailable";
  substitutions =
    "Requested opponent shooting page could not be parsed reliably in this runtime.";
}

export default {
  records,
  sourceRows: [
    {
      dataCategory: "Defense",
      sourceUsed,
      sourceUrl: DEFENSE_URL,
      fetchTime: nowIso(),
      substitutions: substitutions || "None",
    },
  ],
  unavailableReason: records.length
    ? ""
    : "Defense unavailable after attempting the requested NBA Stats opponent shooting page.",
};
`,
    },
    {
      id: "fetch_injuries",
      type: "ts",
      allow: ["fetchUrl"],
      code: String.raw`
const INJURY_INDEX_URL =
  "https://official.nba.com/nba-injury-report-2025-26-season/";
const ESPN_INJURIES_URL = "https://www.espn.com/nba/injuries";

function nowIso() {
  return new Date().toISOString();
}

function unwrapStep(step) {
  return step?.result?.result ?? step?.result ?? {};
}

async function fetchText(url) {
  const result = await callTool("fetchUrl", {
    urls: [url],
    targetLanguage: "EN",
  });
  const row = result?.results?.[0];
  const text = row?.result ? String(row.result) : "";
  if (!row?.success || !text) {
    throw new Error(row?.error || "Failed to fetch " + url);
  }
  return text;
}

function extractPdfLinks(text) {
  return [...text.matchAll(/https:\/\/ak-static\.cms\.nba\.com\/[^"'\s>]+Injury-Report_[^"'\s>]+\.pdf/g)].map(
    (match) => match[0],
  );
}

function parsePdfTimestampFromUrl(url) {
  const filename = url.split("/").pop() || "";
  const match = filename.match(
    /Injury-Report_(\d{4})-(\d{2})-(\d{2})_(\d{2})_(\d{2})(AM|PM)\.pdf/i,
  );
  if (!match) {
    return { sortKey: 0, label: "unknown" };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const meridiem = String(match[6]).toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return {
    sortKey: Date.UTC(year, month - 1, day, hour, minute),
    label:
      match[1] + "-" + match[2] + "-" + match[3] + " " + match[4] + ":" + match[5] + match[6].toUpperCase(),
  };
}

function pickLatestPdfUrl(urls) {
  return urls
    .map((url) => ({ url, meta: parsePdfTimestampFromUrl(url) }))
    .filter((item) => item.meta.sortKey > 0)
    .sort((a, b) => b.meta.sortKey - a.meta.sortKey)[0];
}

function countStatuses(section) {
  const statuses = [];
  for (const match of section.matchAll(/\b(Out|Doubtful|Questionable|Probable|Available)\b/gi)) {
    statuses.push(String(match[1]).toUpperCase());
  }
  return statuses;
}

function normalizeEspnStatus(rawStatus) {
  const status = String(rawStatus || "").toUpperCase();
  if (!status) return "";
  if (status.includes("OUT")) return "OUT";
  if (status.includes("DOUBTFUL")) return "DOUBTFUL";
  if (status.includes("QUESTIONABLE")) return "QUESTIONABLE";
  if (status.includes("PROBABLE")) return "PROBABLE";
  if (status.includes("DAY-TO-DAY") || status.includes("DAY TO DAY")) return "QUESTIONABLE";
  return "";
}

function unique(values) {
  return Array.from(new Set(values));
}

const schedule = unwrapStep(steps.fetch_schedule);
const injuryIndexText = await fetchText(INJURY_INDEX_URL);
const latestPdf = pickLatestPdfUrl(extractPdfLinks(injuryIndexText));
if (!latestPdf) {
  throw new Error("Could not find a linked official NBA injury PDF.");
}

const pdfText = await fetchText(latestPdf.url);
const flatText = pdfText.replace(/\s+/g, " ").trim();
const games = Array.isArray(schedule.games) ? schedule.games : [];
const matchupTokens = games
  .map((game) => ({
    game,
    token: String(game.awayAbbr || "").toUpperCase() + "@" + String(game.homeAbbr || "").toUpperCase(),
  }))
  .filter((item) => item.token.length >= 5);

const recordMap = new Map();
const sortedSegments = matchupTokens
  .map((item) => ({ ...item, start: flatText.indexOf(item.token) }))
  .filter((item) => item.start >= 0)
  .sort((a, b) => a.start - b.start);

for (let index = 0; index < sortedSegments.length; index += 1) {
  const item = sortedSegments[index];
  let end = sortedSegments[index + 1]?.start ?? flatText.length;
  const nextDateIdx = flatText.indexOf("04/01/2026", item.start + item.token.length);
  if (nextDateIdx >= 0 && nextDateIdx < end) {
    end = nextDateIdx;
  }

  const segment = flatText.slice(item.start, end);
  const awayMarker = item.game.away;
  const homeMarker = item.game.home;
  const awayPos = segment.indexOf(awayMarker);
  const homePos = segment.indexOf(homeMarker, Math.max(0, awayPos + awayMarker.length));
  if (awayPos < 0 || homePos < 0) continue;

  const awaySection = segment.slice(awayPos + awayMarker.length, homePos).trim();
  const homeSection = segment.slice(homePos + homeMarker.length).trim();

  recordMap.set(item.game.away, {
    team: item.game.away,
    notYetSubmitted: /NOT YET SUBMITTED/i.test(awaySection),
    statuses: countStatuses(awaySection),
    source: "official",
  });
  recordMap.set(item.game.home, {
    team: item.game.home,
    notYetSubmitted: /NOT YET SUBMITTED/i.test(homeSection),
    statuses: countStatuses(homeSection),
    source: "official",
  });
}

const allTeams = unique(games.flatMap((game) => [game.away, game.home]).filter(Boolean));
const fallbackTeams = allTeams.filter((team) => {
  const existing = recordMap.get(team);
  return !existing || existing.notYetSubmitted;
});

const sourceRows = [
  {
    dataCategory: "Injuries index",
    sourceUsed: "Official NBA Injury Report Index",
    sourceUrl: INJURY_INDEX_URL,
    fetchTime: nowIso(),
    substitutions: "None",
  },
  {
    dataCategory: "Injuries PDF",
    sourceUsed: "Official NBA Injury Report PDF",
    sourceUrl: latestPdf.url,
    fetchTime: nowIso(),
    substitutions:
      "Latest linked ak-static.cms.nba.com PDF from the official injury index page.",
  },
];

if (fallbackTeams.length) {
  try {
    const espnText = await fetchText(ESPN_INJURIES_URL);
    const lines = espnText.split("\n");
    const fallbackTeamNames = [...fallbackTeams].sort((a, b) => b.length - a.length);
    const espnSections = new Map();
    let currentTeam = "";

    function matchEspnTeamHeader(line) {
      const trimmed = String(line || "").trim();
      if (!trimmed.startsWith("![Image")) return "";
      for (const teamName of fallbackTeamNames) {
        if (trimmed.endsWith(teamName) || trimmed.includes(")" + teamName)) {
          return teamName;
        }
      }
      return "";
    }

    for (const line of lines) {
      const headerTeam = matchEspnTeamHeader(line);
      if (headerTeam) {
        currentTeam = headerTeam;
        if (!espnSections.has(currentTeam)) {
          espnSections.set(currentTeam, []);
        }
        continue;
      }

      const trimmed = line.trim();
      if (!currentTeam || !trimmed.startsWith("|")) continue;
      const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length < 5) continue;
      if (cells[0] === "---" || cells[0] === "Player") continue;

      const normalizedStatus = normalizeEspnStatus(cells[3]);
      if (normalizedStatus) {
        espnSections.get(currentTeam).push(normalizedStatus);
      }
    }

    const usedTeams = [];
    for (const team of fallbackTeams) {
      if (!espnSections.has(team)) continue;
      recordMap.set(team, {
        team,
        notYetSubmitted: false,
        statuses: espnSections.get(team),
        source: "espn",
      });
      usedTeams.push(team);
    }

    sourceRows.push({
      dataCategory: "Injuries backup",
      sourceUsed: "ESPN NBA Injuries",
      sourceUrl: ESPN_INJURIES_URL,
      fetchTime: nowIso(),
      substitutions: usedTeams.length
        ? "Used only for teams missing from the official PDF or marked NOT YET SUBMITTED: " + usedTeams.join(", ") + "."
        : "Fetched as a backup source, but none of the missing teams could be filled from it.",
    });
  } catch {
    sourceRows.push({
      dataCategory: "Injuries backup",
      sourceUsed: "ESPN NBA Injuries",
      sourceUrl: ESPN_INJURIES_URL,
      fetchTime: nowIso(),
      substitutions:
        "Attempted backup source for teams missing from the official PDF or marked NOT YET SUBMITTED, but it was not retrieved reliably.",
    });
  }
}

const records = allTeams
  .map((team) => recordMap.get(team))
  .filter(Boolean);

export default {
  records,
  injuryIndexUrl: INJURY_INDEX_URL,
  injuryPdfUrl: latestPdf.url,
  injuryPdfFilenameTimestamp: latestPdf.meta.label,
  sourceRows,
};
`,
    },
    {
      id: "score_and_write_report",
      type: "ts",
      code: String.raw`
const REPORT_PATH = "/workspace/nba_matchup_edge_report.md";

function unwrapStep(step) {
  return step?.result?.result ?? step?.result ?? {};
}

function nowIso() {
  return new Date().toISOString();
}

function compareGap(absGap, thresholds, maxPoints) {
  let points = 0;
  if (absGap >= thresholds[0]) points = 1;
  if (absGap >= thresholds[1]) points = 2;
  if (absGap >= thresholds[2]) points = 3;
  if (points > maxPoints) return maxPoints;
  return points;
}

function defaultShortReason(gap) {
  if (gap === 0) {
    return "No scoring gap across retrieved categories.";
  }
  return "Small edge from retrieved categories.";
}

function markEdge(points, side, category, pts, teamName, reasonParts) {
  const labels = {
    strength: "overall strength",
    recent: "recent form",
    fourFactors: "four factors",
    defense: "defense",
    injuries: "injuries",
  };
  points[side][category] = pts;
  points[side].total += pts;
  reasonParts.push((labels[category] || category) + ": " + teamName);
}

function noSubstitution(value) {
  return value == null || value === "" ? "None" : String(value);
}

function safeLineValue(value) {
  return value == null || value === "" ? "Unavailable" : String(value);
}

function classifyEdge(gap) {
  if (gap >= 7) return "Very strong";
  if (gap >= 4) return "Strong";
  if (gap >= 2) return "Moderate";
  return "No clear edge";
}

function injuryBurden(entry) {
  if (!entry) return null;
  if (entry.notYetSubmitted) return null;
  const weights = {
    OUT: 1,
    DOUBTFUL: 0.7,
    QUESTIONABLE: 0.4,
    PROBABLE: 0.15,
    AVAILABLE: 0,
  };
  return (entry.statuses || []).reduce(
    (sum, status) => sum + (weights[status] || 0),
    0,
  );
}

function table(headers, rows) {
  const header = "| " + headers.join(" | ") + " |";
  const divider = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows.map((row) => "| " + row.join(" | ") + " |");
  return [header, divider].concat(body).join("\n");
}

const schedule = unwrapStep(steps.fetch_schedule);
const overallStrength = unwrapStep(steps.fetch_overall_strength);
const recentForm = unwrapStep(steps.fetch_recent_form);
const fourFactors = unwrapStep(steps.fetch_four_factors);
const defense = unwrapStep(steps.fetch_defense);
const injuries = unwrapStep(steps.fetch_injuries);

const games = Array.isArray(schedule.games) ? schedule.games : [];
const strengthMap = new Map(
  Array.isArray(overallStrength.records)
    ? overallStrength.records.map((row) => [row.team, row.value])
    : [],
);
const recentFormMap = new Map(
  Array.isArray(recentForm.records)
    ? recentForm.records.map((row) => [row.team, row.value])
    : [],
);
const fourFactorsMap = new Map(
  Array.isArray(fourFactors.records)
    ? fourFactors.records.map((row) => [row.team, row.value])
    : [],
);
const defenseMap = new Map(
  Array.isArray(defense.records)
    ? defense.records.map((row) => [row.team, row.value])
    : [],
);
const injuryMap = new Map(
  Array.isArray(injuries.records)
    ? injuries.records.map((row) => [row.team, row])
    : [],
);
const sourceRows = []
  .concat(schedule.sourceRows || [])
  .concat(overallStrength.sourceRows || [])
  .concat(recentForm.sourceRows || [])
  .concat(fourFactors.sourceRows || [])
  .concat(defense.sourceRows || [])
  .concat(injuries.sourceRows || []);

const summaryRows = [];
const detailRows = [];

for (const game of games) {
  const awayStrength = strengthMap.get(game.away);
  const homeStrength = strengthMap.get(game.home);
  const awayRecent = recentFormMap.get(game.away);
  const homeRecent = recentFormMap.get(game.home);
  const awayFourFactors = fourFactorsMap.get(game.away);
  const homeFourFactors = fourFactorsMap.get(game.home);
  const awayDefense = defenseMap.get(game.away);
  const homeDefense = defenseMap.get(game.home);
  const awayInjuryEntry = injuryMap.get(game.away);
  const homeInjuryEntry = injuryMap.get(game.home);

  const points = {
    away: { strength: 0, recent: 0, fourFactors: 0, defense: 0, injuries: 0, total: 0 },
    home: { strength: 0, recent: 0, fourFactors: 0, defense: 0, injuries: 0, total: 0 },
  };
  const reasonParts = [];

  if (Number.isFinite(awayStrength) && Number.isFinite(homeStrength)) {
    const gap = awayStrength - homeStrength;
    const pts = compareGap(Math.abs(gap), [1, 3, 6], 3);
    if (pts > 0) {
      if (gap > 0) {
        markEdge(points, "away", "strength", pts, game.away, reasonParts);
      } else if (gap < 0) {
        markEdge(points, "home", "strength", pts, game.home, reasonParts);
      }
    }
  } else {
    reasonParts.push("overall strength unavailable");
  }

  if (Number.isFinite(awayRecent) && Number.isFinite(homeRecent)) {
    const gap = awayRecent - homeRecent;
    const pts = compareGap(Math.abs(gap), [2, 7, 9999], 2);
    if (pts > 0) {
      if (gap > 0) {
        markEdge(points, "away", "recent", pts, game.away, reasonParts);
      } else if (gap < 0) {
        markEdge(points, "home", "recent", pts, game.home, reasonParts);
      }
    }
  } else {
    reasonParts.push("recent form unavailable");
  }

  if (Number.isFinite(awayFourFactors) && Number.isFinite(homeFourFactors)) {
    const gap = awayFourFactors - homeFourFactors;
    const pts = compareGap(Math.abs(gap), [1, 2.5, 4], 3);
    if (pts > 0) {
      if (gap > 0) {
        markEdge(points, "away", "fourFactors", pts, game.away, reasonParts);
      } else if (gap < 0) {
        markEdge(points, "home", "fourFactors", pts, game.home, reasonParts);
      }
    }
  } else {
    reasonParts.push("four factors unavailable");
  }

  if (Number.isFinite(awayDefense) && Number.isFinite(homeDefense)) {
    const gap = homeDefense - awayDefense;
    const pts = compareGap(Math.abs(gap), [0.75, 1.5, 9999], 2);
    if (pts > 0) {
      if (gap > 0) {
        markEdge(points, "away", "defense", pts, game.away, reasonParts);
      } else if (gap < 0) {
        markEdge(points, "home", "defense", pts, game.home, reasonParts);
      }
    }
  } else {
    reasonParts.push("defense unavailable");
  }

  const awayBurden = injuryBurden(awayInjuryEntry);
  const homeBurden = injuryBurden(homeInjuryEntry);
  if (awayBurden == null || homeBurden == null) {
    reasonParts.push("injuries unavailable after official and backup sources");
  } else {
    const gap = homeBurden - awayBurden;
    const pts = compareGap(Math.abs(gap), [0.75, 1.5, 3], 3);
    if (pts > 0) {
      if (gap > 0) {
        markEdge(points, "away", "injuries", pts, game.away, reasonParts);
      } else if (gap < 0) {
        markEdge(points, "home", "injuries", pts, game.home, reasonParts);
      }
    }
  }

  const awayTotal = points.away.total;
  const homeTotal = points.home.total;
  const gap = Math.abs(awayTotal - homeTotal);
  const teamWithEdge =
    awayTotal > homeTotal ? game.away : homeTotal > awayTotal ? game.home : "None";

  summaryRows.push({
    matchup: game.matchup,
    teamWithEdge,
    edgeLevel: classifyEdge(gap),
    edgeGap: gap,
    shortReason: reasonParts.length ? reasonParts.join("; ") : defaultShortReason(gap),
  });

  detailRows.push({
    matchup: game.matchup,
    team: game.away,
    overallStrengthPoints: points.away.strength,
    recentFormPoints: points.away.recent,
    fourFactorsPoints: points.away.fourFactors,
    defensePoints: points.away.defense,
    injuryPoints: points.away.injuries,
    totalPoints: awayTotal,
  });
  detailRows.push({
    matchup: game.matchup,
    team: game.home,
    overallStrengthPoints: points.home.strength,
    recentFormPoints: points.home.recent,
    fourFactorsPoints: points.home.fourFactors,
    defensePoints: points.home.defense,
    injuryPoints: points.home.injuries,
    totalPoints: homeTotal,
  });
}

const summaryTable = table(
  ["Matchup", "Team with edge", "Edge level", "Edge gap", "Short reason"],
  summaryRows.map((row) => [
    row.matchup,
    row.teamWithEdge,
    row.edgeLevel,
    String(row.edgeGap),
    row.shortReason,
  ]),
);

const detailTable = table(
  [
    "Matchup",
    "Team",
    "Overall strength points",
    "Recent form points",
    "Four factors points",
    "Defense points",
    "Injury points",
    "Total points",
  ],
  detailRows.map((row) => [
    row.matchup,
    row.team,
    String(row.overallStrengthPoints),
    String(row.recentFormPoints),
    String(row.fourFactorsPoints),
    String(row.defensePoints),
    String(row.injuryPoints),
    String(row.totalPoints),
  ]),
);

const sourceTable = table(
  ["Data category", "Source used", "Source URL", "Fetch time", "Any substitutions made"],
  sourceRows.map((row) => [
    row.dataCategory,
    row.sourceUsed,
    row.sourceUrl,
    row.fetchTime,
    noSubstitution(row.substitutions),
  ]),
);

const lines = [
  "# NBA Matchup Edge Report",
  "",
  "Fetch time: " + nowIso(),
  "Injury index URL: " + safeLineValue(injuries.injuryIndexUrl),
  "Injury PDF URL used: " + safeLineValue(injuries.injuryPdfUrl),
  "Injury PDF filename timestamp: " + safeLineValue(injuries.injuryPdfFilenameTimestamp),
  "",
  "## Matchup Summary",
  "",
  summaryTable,
  "",
  "## Detailed Scoring",
  "",
  detailTable,
  "",
  "## Source Summary",
  "",
  sourceTable,
  "",
  "## Notes",
  "",
  "- Public sources only.",
  "- Exact requested URLs were fetched first.",
  "- Overall team strength uses the first reliable public fallback after https://www.nba.com/stats/teams; see Source Summary for the exact source used.",
  "- Recent form falls back to ESPN team schedule results if TeamRankings is blocked or unavailable.",
  "- Four factors are parsed directly from https://www.nba.com/stats/teams/four-factors when that page is retrievable.",
  "- Defense is parsed directly from https://www.nba.com/stats/teams/opponent-shooting when that page is retrievable.",
  "- Injuries use the official NBA injury index and latest linked PDF first, then ESPN NBA injuries only for teams missing from the official PDF or marked NOT YET SUBMITTED.",
  "- No betting advice, probabilities, or recommendations are included.",
];

await fs.promises.writeFile(REPORT_PATH, lines.join("\n"), "utf8");

export default {
  ok: true,
  reportPath: REPORT_PATH,
  matchupCount: summaryRows.length,
  injuryPdfUrl: injuries.injuryPdfUrl || "",
  injuryPdfFilenameTimestamp: injuries.injuryPdfFilenameTimestamp || "",
  summaryRows,
};
`,
    },
  ],
});
