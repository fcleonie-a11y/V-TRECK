import { userReady } from "./app.js";
import { calculateStatistics, getMatches, getUserSection } from "./data.js";

const user = await userReady;
try {
  const [matches, ranked] = await Promise.all([getMatches(user.uid), getUserSection(user.uid, "ranked")]);
  const stats = calculateStatistics(matches);
  set("current-rank", ranked?.currentRank || "Unranked");
  set("current-rr", ranked?.rr != null ? `${ranked.rr} RR` : "Noch keine Rangdaten");
  set("winrate", matches.length ? `${stats.winrate}%` : "–");
  set("record", `${stats.wins} Siege · ${stats.losses} Niederlagen`);
  set("avg-kda", matches.length ? stats.averageKda : "–");
  set("avg-score", `${stats.averageKills} / ${stats.averageDeaths} / ${stats.averageAssists}`);
  set("match-count", stats.totalMatches);
  renderRecent(matches.slice(0, 5));
  renderRrChart(matches);
} catch (error) {
  console.error(error);
  document.querySelector("#recent-matches").textContent = "Daten konnten nicht geladen werden.";
}

function set(id, value) { document.querySelector(`#${id}`).textContent = value; }
function renderRecent(matches) {
  const target = document.querySelector("#recent-matches");
  if (!matches.length) return;
  target.className = "";
  target.innerHTML = matches.map(match => `<a class="recent-row ${match.result}" href="matches.html">
    <i class="result-line"></i><div><b>${escape(match.agent)} · ${escape(match.map)}</b><small>${escape(match.gameMode)} · ${date(match)}</small></div>
    <strong>${Number(match.kills || 0)}/${Number(match.deaths || 0)}/${Number(match.assists || 0)}</strong>
  </a>`).join("");
}
function renderRrChart(matches) {
  const ranked = [...matches]
    .filter(match => match.gameMode === "Competitive" && match.rrChange != null)
    .reverse()
    .slice(-20);
  if (!ranked.length) return;
  const width = 700, height = 250;
  const rankOrder = [
    "Iron 1","Iron 2","Iron 3","Bronze 1","Bronze 2","Bronze 3",
    "Silver 1","Silver 2","Silver 3","Gold 1","Gold 2","Gold 3",
    "Platinum 1","Platinum 2","Platinum 3","Diamond 1","Diamond 2","Diamond 3",
    "Ascendant 1","Ascendant 2","Ascendant 3","Immortal 1","Immortal 2","Immortal 3","Radiant"
  ];
  const rankScore = (rank, rr) => {
    const index = rankOrder.indexOf(rank);
    return index === -1 || rr == null ? null : index * 100 + Number(rr);
  };
  const firstAfter = rankScore(ranked[0].rankAfter, ranked[0].rrAfter);
  let runningTotal = firstAfter != null
    ? firstAfter - Number(ranked[0].rrChange)
    : 0;
  const values = [runningTotal];
  ranked.forEach(match => {
    const absoluteAfter = rankScore(match.rankAfter, match.rrAfter);
    runningTotal = absoluteAfter != null
      ? absoluteAfter
      : runningTotal + Number(match.rrChange);
    values.push(runningTotal);
  });
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 20);
  const points = values.map((value, index) =>
    `${(index / Math.max(values.length - 1, 1)) * width},${height - ((value - min) / range) * (height - 40) - 20}`
  ).join(" ");
  const total = values.at(-1) - values[0];
  const lastMatch = ranked.at(-1);
  const rankLabel = lastMatch.rankAfter ? `${lastMatch.rankAfter} · ${lastMatch.rrAfter ?? "–"} RR` : "";
  const totalLabel = `${total > 0 ? "+" : ""}${total} Punkte${rankLabel ? ` · ${rankLabel}` : ""}`;
  document.querySelector("#rr-chart").innerHTML = `<div class="chart-total">${totalLabel}</div><svg class="rr-line" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4655" stop-opacity=".35"/><stop offset="1" stop-color="#ff4655" stop-opacity="0"/></linearGradient></defs><polyline points="0,${height} ${points} ${width},${height}" fill="url(#fill)" stroke="none"/><polyline points="${points}" fill="none" stroke="#ff4655" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>`;
}
function date(match) { return match.playedAt?.toDate?.().toLocaleDateString("de-DE") || match.date || ""; }
function escape(value = "") { const el = document.createElement("span"); el.textContent = value; return el.innerHTML; }
