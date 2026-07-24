import { userReady } from "./app.js";
import { calculateStatistics, getMatches } from "./data.js";

const user = await userReady;
try {
  const matches = await getMatches(user.uid);
  const s = calculateStatistics(matches);
  const cards = [
    ["Matches", s.totalMatches], ["Siege", s.wins], ["Niederlagen", s.losses],
    ["Winrate", `${s.winrate}%`], ["Ø Kills", s.averageKills], ["Ø Deaths", s.averageDeaths],
    ["Ø Assists", s.averageAssists], ["Ø ACS", s.averageAcs], ["Ø KDA", s.averageKda]
  ];
  document.querySelector("#statistics-cards").innerHTML = cards.map(([label,value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
  set("favorite-agent", s.favoriteAgent || "–"); set("favorite-map", s.favoriteMap || "–");
  set("best-map", s.bestMap || "–"); set("worst-map", s.worstMap || "–");
  set("win-streak", s.longestWinStreak); set("loss-streak", s.longestLossStreak);
  renderHistory(matches);
} catch (error) { console.error(error); }

function renderHistory(matches) {
  const ranked = matches.filter(m => m.rankAfter || m.rrAfter != null).slice(0, 20);
  if (!ranked.length) return;
  const target = document.querySelector("#rank-history"); target.className = "timeline";
  target.innerHTML = ranked.map(m => `<div class="timeline-item"><span>${m.playedAt?.toDate?.().toLocaleDateString("de-DE") || m.date}</span><b>${escape(m.rankAfter || "Rang unverändert")} · ${m.rrAfter ?? "–"} RR</b><strong>${m.rrChange > 0 ? "+" : ""}${m.rrChange ?? "–"}</strong></div>`).join("");
}
function set(id, value) { document.querySelector(`#${id}`).textContent = value; }
function escape(value = "") { const el = document.createElement("span"); el.textContent = value; return el.innerHTML; }
