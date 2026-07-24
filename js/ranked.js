import { userReady } from "./app.js";
import { getMatches, getUserSection, saveUserSection } from "./data.js";

const user = await userReady;
const form = document.querySelector("#ranked-form");
const message = document.querySelector("#ranked-message");

try {
  const [ranked, matches] = await Promise.all([
    getUserSection(user.uid, "ranked"),
    getMatches(user.uid)
  ]);
  fill(ranked || {});
  render(ranked || {}, matches);
} catch (error) {
  show("Rangdaten konnten nicht geladen werden.", true);
  console.error(error);
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  data.rr = Number(data.rr);
  button.disabled = true;
  try {
    await saveUserSection(user.uid, "ranked", data);
    render(data, await getMatches(user.uid));
    show("Rangdaten wurden gespeichert.");
  } catch (error) {
    show("Rangdaten konnten nicht gespeichert werden.", true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

function fill(ranked) {
  form.currentRank.value = ranked.currentRank || "";
  form.peakRank.value = ranked.peakRank || "";
  form.rr.value = ranked.rr ?? "";
  form.episode.value = ranked.episode || "";
  form.act.value = ranked.act || "";
}

function render(ranked, matches) {
  set("rank-current", ranked.currentRank || "Unranked");
  set("rank-rr", ranked.rr != null ? `${ranked.rr} RR` : "– RR");
  set("rank-peak", ranked.peakRank || "–");
  set("rank-episode", ranked.episode || "–");
  set("rank-act", ranked.act || "–");
  const history = matches.filter(match => match.gameMode === "Competitive").slice(0, 12);
  const target = document.querySelector("#ranked-history");
  if (!history.length) {
    target.className = "empty-state";
    target.textContent = "Noch keine Ranked-Matches gespeichert.";
    return;
  }
  target.className = "timeline";
  target.innerHTML = history.map(match => `<div class="timeline-item">
    <span>${match.date || "–"} · ${safe(match.map)}</span>
    <b>${safe(match.rankAfter || match.rankBefore || "–")} · ${match.rrAfter ?? "–"} RR</b>
    <strong>${match.rrChange > 0 ? "+" : ""}${match.rrChange ?? "–"}</strong>
  </div>`).join("");
}

function set(id, value) { document.querySelector(`#${id}`).textContent = value; }
function show(text, error = false) {
  message.textContent = text; message.hidden = false; message.classList.toggle("error", error);
}
function safe(value = "") {
  const element = document.createElement("span"); element.textContent = value; return element.innerHTML;
}
