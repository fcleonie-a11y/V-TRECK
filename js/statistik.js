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
  renderKillTrend(filtered);
  renderModeStatistics(matches);
  renderHistory(filtered);
}

function renderKillTrend(filteredMatches) {
  const target = document.querySelector("#kill-chart");
  const badge = document.querySelector("#kill-trend-badge");
  const values = filteredMatches
    .filter(match => Number.isFinite(Number(match.kills)))
    .slice(0, 10)
    .reverse()
    .map(match => Number(match.kills));

  if (values.length < 2) {
    target.className = "kill-chart empty-state";
    target.textContent = "Trage mindestens zwei Matches ein.";
    badge.className = "trend-badge neutral";
    badge.textContent = "Noch keine Daten";
    set("kills-recent", "–");
    set("kills-previous", "–");
    set("kills-change", "–");
    return;
  }

  const split = Math.max(1, values.length - 5);
  const previousValues = values.slice(0, split);
  const recentValues = values.slice(split);
  const recentAverage = average(recentValues);
  const previousAverage = average(previousValues);
  const difference = recentAverage - previousAverage;
  const percent = previousAverage ? Math.round((difference / previousAverage) * 100) : null;
  const improving = difference > 0.15;
  const declining = difference < -0.15;

  badge.className = `trend-badge ${improving ? "positive" : declining ? "negative" : "neutral"}`;
  const changeLabel = percent == null ? `${Math.abs(difference).toFixed(1)} Kills` : `${Math.abs(percent)}%`;
  badge.textContent = improving ? `↑ ${changeLabel} besser` :
    declining ? `↓ ${changeLabel} schwächer` : "→ Stabil";
  set("kills-recent", recentAverage.toFixed(1));
  set("kills-previous", previousAverage.toFixed(1));
  set("kills-change", `${difference > 0 ? "+" : ""}${difference.toFixed(1)}`);

  target.className = "kill-chart";
  target.innerHTML = `<canvas aria-label="Kill-Verlauf der letzten ${values.length} Matches"></canvas>
    <div class="kill-chart-labels"><span>Älter</span><span>Letztes Match</span></div>`;
  const canvas = target.querySelector("canvas");
  const draw = () => drawKillChart(canvas, values, improving, declining);
  draw();
  new ResizeObserver(draw).observe(target);
}

function drawKillChart(canvas, values, improving, declining) {
  const width = Math.max(canvas.parentElement.clientWidth, 280);
  const height = 230;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);

  const padding = { top: 24, right: 20, bottom: 28, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...values, 10);
  const stepX = chartWidth / Math.max(values.length - 1, 1);
  const point = (value, index) => ({
    x: padding.left + index * stepX,
    y: padding.top + chartHeight - (value / maximum) * chartHeight
  });

  context.strokeStyle = "rgba(142,154,174,.18)";
  context.lineWidth = 1;
  for (let row = 0; row <= 4; row++) {
    const y = padding.top + (chartHeight / 4) * row;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  const color = improving ? "#56e3d6" : declining ? "#ff4655" : "#f2f5f8";
  const gradient = context.createLinearGradient(0, padding.top, 0, height);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  context.beginPath();
  values.forEach((value, index) => {
    const current = point(value, index);
    index ? context.lineTo(current.x, current.y) : context.moveTo(current.x, current.y);
  });
  const last = point(values.at(-1), values.length - 1);
  const first = point(values[0], 0);
  context.lineTo(last.x, padding.top + chartHeight);
  context.lineTo(first.x, padding.top + chartHeight);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.beginPath();
  values.forEach((value, index) => {
    const current = point(value, index);
    index ? context.lineTo(current.x, current.y) : context.moveTo(current.x, current.y);
  });
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();

  values.forEach((value, index) => {
    const current = point(value, index);
    context.beginPath();
    context.arc(current.x, current.y, index === values.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
    context.fillStyle = index === values.length - 1 ? color : "#101722";
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  });
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
