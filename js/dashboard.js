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
  const ranked = [...matches].filter(m => m.rrAfter != null).reverse().slice(-12);
  if (ranked.length < 2) return;
  const width = 700, height = 250;
  const values = ranked.map(m => Number(m.rrAfter));
  const max = Math.max(...values, 100), min = Math.min(...values, 0);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * width},${height - ((value - min) / Math.max(max - min, 1)) * (height - 30) - 15}`).join(" ");
  document.querySelector("#rr-chart").innerHTML = `<svg class="rr-line" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4655" stop-opacity=".35"/><stop offset="1" stop-color="#ff4655" stop-opacity="0"/></linearGradient></defs><polyline points="0,${height} ${points} ${width},${height}" fill="url(#fill)" stroke="none"/><polyline points="${points}" fill="none" stroke="#ff4655" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>`;
}
function date(match) { return match.playedAt?.toDate?.().toLocaleDateString("de-DE") || match.date || ""; }
function escape(value = "") { const el = document.createElement("span"); el.textContent = value; return el.innerHTML; }
