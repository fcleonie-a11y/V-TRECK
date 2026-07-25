import { userReady } from "./app.js";
import { calculateStatistics, getMatches } from "./data.js";

const user = await userReady;
const modeSelect = document.querySelector("#statistics-mode");
let matches = [];

try {
  matches = await getMatches(user.uid);
  populateModes();
  render();
  modeSelect.addEventListener("change", render);
} catch (error) {
  console.error(error);
}

function populateModes() {
  const modes = [...new Set(matches.map(match => match.gameMode).filter(Boolean))].sort();
  modeSelect.insertAdjacentHTML("beforeend", modes.map(mode => `<option value="${safe(mode)}">${safe(mode)}</option>`).join(""));
}

function render() {
  const selected = modeSelect.value;
  const filtered = selected === "all" ? matches : matches.filter(match => match.gameMode === selected);
  const stats = calculateStatistics(filtered);
  const cards = [
    ["Matches", stats.totalMatches], ["Siege", stats.wins], ["Niederlagen", stats.losses],
    ["Winrate", `${stats.winrate}%`], ["Ø Kills", stats.averageKills], ["Ø Deaths", stats.averageDeaths],
    ["Ø Assists", stats.averageAssists], ["Ø ACS", stats.averageAcs], ["Ø KDA", stats.averageKda]
  ];
  document.querySelector("#statistics-cards").innerHTML = cards.map(([label, value]) =>
    `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`
  ).join("");
  set("favorite-agent", stats.favoriteAgent || "–");
  set("favorite-map", stats.favoriteMap || "–");
  set("best-map", stats.bestMap || "–");
  set("worst-map", stats.worstMap || "–");
  set("win-streak", stats.longestWinStreak);
  set("loss-streak", stats.longestLossStreak);
  renderModeStatistics(matches);
  renderHistory(filtered);
}

function renderModeStatistics(allMatches) {
  const grouped = allMatches.reduce((groups, match) => {
    const mode = match.gameMode || "Unbekannt";
    (groups[mode] ||= []).push(match);
    return groups;
  }, {});
  const rows = Object.entries(grouped).map(([mode, modeMatches]) => {
    const stats = calculateStatistics(modeMatches);
    return { mode, ...stats };
  }).sort((a, b) => b.totalMatches - a.totalMatches);
  const target = document.querySelector("#mode-statistics");
  if (!rows.length) {
    target.className = "mode-table empty-state";
    target.textContent = "Noch keine Matches vorhanden.";
    return;
  }
  target.className = "mode-table";
  target.innerHTML = `<div class="mode-row mode-head"><span>Modus</span><span>Matches</span><span>Winrate</span><span>Ø KDA</span><span>Ø ACS</span></div>` +
    rows.map(row => `<button class="mode-row" data-mode="${safe(row.mode)}"><b>${safe(row.mode)}</b><span>${row.totalMatches}</span><span>${row.winrate}%</span><span>${row.averageKda}</span><span>${row.averageAcs}</span></button>`).join("");
  target.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
    modeSelect.value = button.dataset.mode;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
}

function renderHistory(filteredMatches) {
  const ranked = filteredMatches.filter(match => match.rankAfter || match.rrAfter != null).slice(0, 20);
  const target = document.querySelector("#rank-history");
  if (!ranked.length) {
    target.className = "timeline empty-state";
    target.textContent = modeSelect.value === "all" || modeSelect.value === "Competitive"
      ? "Noch keine Ranked-Daten vorhanden."
      : "Dieser Spielmodus besitzt keine Ranked-Daten.";
    return;
  }
  target.className = "timeline";
  target.innerHTML = ranked.map(match => `<div class="timeline-item"><span>${match.playedAt?.toDate?.().toLocaleDateString("de-DE") || match.date}</span><b>${safe(match.rankAfter || "Rang unverändert")} · ${match.rrAfter ?? "–"} RR</b><strong>${match.rrChange > 0 ? "+" : ""}${match.rrChange ?? "–"}</strong></div>`).join("");
}

function set(id, value) { document.querySelector(`#${id}`).textContent = value; }
function safe(value = "") {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
