import { userReady } from "./app.js";
import { addMatch, getMatches, removeMatch } from "./data.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const user = await userReady;
const dialog = document.querySelector("#match-dialog");
const form = document.querySelector("#match-form");
const list = document.querySelector("#match-list");
let matches = [];

setDefaultDate();
await loadMatches();
if (location.hash === "#new") dialog.showModal();

document.querySelector("#open-match-form").addEventListener("click", () => dialog.showModal());
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
document.querySelector("#match-search").addEventListener("input", render);
document.querySelector("#result-filter").addEventListener("change", render);

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = "Speichert…";
  const data = new FormData(form);
  const dateTime = new Date(`${data.get("date")}T${data.get("time")}`);
  const numeric = ["roundsWon","roundsLost","kills","deaths","assists","acs","adr","firstBloods","firstDeaths","clutches","rrChange","rrAfter","duration"];
  const match = Object.fromEntries(data);
  numeric.forEach(key => match[key] = data.get(key) === "" ? null : Number(data.get(key)));
  match.mvp = data.get("mvp") === "on";
  match.playedAt = Timestamp.fromDate(dateTime);
  match.matchId = crypto.randomUUID();
  try {
    await addMatch(user.uid, match);
    form.reset(); setDefaultDate(); dialog.close(); await loadMatches();
  } catch (error) {
    showMessage("Match konnte nicht gespeichert werden. Prüfe deine Firestore-Regeln.", true);
    console.error(error);
  } finally { button.disabled = false; button.textContent = "Match speichern"; }
});

list.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]");
  if (!button || !confirm("Dieses Match wirklich löschen?")) return;
  button.disabled = true;
  try { await removeMatch(user.uid, button.dataset.delete); await loadMatches(); }
  catch { button.disabled = false; }
});

async function loadMatches() {
  try { matches = await getMatches(user.uid); render(); }
  catch (error) { list.innerHTML = `<div class="empty-state panel">Matches konnten nicht geladen werden.</div>`; console.error(error); }
}
function render() {
  const term = document.querySelector("#match-search").value.toLowerCase();
  const result = document.querySelector("#result-filter").value;
  const filtered = matches.filter(m => (!result || m.result === result) && [m.map,m.agent,m.gameMode].some(value => String(value || "").toLowerCase().includes(term)));
  if (!filtered.length) { list.innerHTML = `<div class="empty-state panel">Keine passenden Matches gefunden.</div>`; return; }
  list.innerHTML = filtered.map(match => `<article class="match-row ${match.result}">
    <i class="indicator"></i><div><h3>${escape(match.agent)} · ${escape(match.map)}</h3><small>${escape(match.gameMode)} · ${formatDate(match)}</small></div>
    <div><span class="result-tag">${match.result === "win" ? "SIEG" : "NIEDERLAGE"}</span><b>${match.roundsWon ?? "–"} : ${match.roundsLost ?? "–"}</b></div>
    <div class="desktop-stat"><span>K / D / A</span><b>${n(match.kills)} / ${n(match.deaths)} / ${n(match.assists)}</b></div>
    <div class="desktop-stat"><span>ACS</span><b>${n(match.acs)}</b></div><div class="desktop-stat"><span>RR</span><b>${signed(match.rrChange)}</b></div>
    <div class="desktop-stat"><span>Dauer</span><b>${match.duration ? `${match.duration}m` : "–"}</b></div>
    <button class="delete-match" data-delete="${match.id}" title="Match löschen" aria-label="Match löschen">×</button>
  </article>`).join("");
}
function setDefaultDate() { const now = new Date(); form.date.value = now.toISOString().slice(0,10); form.time.value = now.toTimeString().slice(0,5); }
function showMessage(text, error) { const el = document.querySelector("#match-message"); el.textContent = text; el.hidden = false; el.classList.toggle("error", error); }
function formatDate(match) { return match.playedAt?.toDate?.().toLocaleString("de-DE", { dateStyle:"medium", timeStyle:"short" }) || `${match.date} ${match.time}`; }
function signed(value) { return value == null ? "–" : `${value > 0 ? "+" : ""}${value}`; }
function n(value) { return Number(value || 0); }
function escape(value = "") { const el = document.createElement("span"); el.textContent = value; return el.innerHTML; }
