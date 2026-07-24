import { userReady } from "./app.js";
import { getUserSection, saveRouletteResult } from "./data.js";

const agents = [
  ["Brimstone","Controller"],["Viper","Controller"],["Omen","Controller"],["Astra","Controller"],["Harbor","Controller"],["Clove","Controller"],
  ["Sova","Initiator"],["Breach","Initiator"],["Skye","Initiator"],["KAY/O","Initiator"],["Fade","Initiator"],["Gekko","Initiator"],["Tejo","Initiator"],
  ["Sage","Sentinel"],["Cypher","Sentinel"],["Killjoy","Sentinel"],["Chamber","Sentinel"],["Deadlock","Sentinel"],["Vyse","Sentinel"],
  ["Phoenix","Duelist"],["Jett","Duelist"],["Reyna","Duelist"],["Raze","Duelist"],["Yoru","Duelist"],["Neon","Duelist"],["Iso","Duelist"],["Waylay","Duelist"]
];
const challenges = ["Nur Guardian kaufen, sobald möglich.","Nutze deine Ultimate innerhalb von 30 Sekunden nach Erhalt.","Spiele jede Runde für den ersten Kontakt.","Keine Aufgabe – fokussiere saubere Kommunikation."];
const sabotage = ["Tausche nach jeder Runde die Hauptwaffe.","Du darfst in der ersten Buy-Runde keine Rifle kaufen.","Ein Teammate entscheidet dein Loadout.","Nutze Fähigkeiten nur nach Ansage eines Teammates."];
const user = await userReady;
let role = "All", current = null;
const toggles = document.querySelector("#agent-toggles");
toggles.innerHTML = agents.map(([name, agentRole]) => `<label class="agent-toggle" data-agent-role="${agentRole}"><input type="checkbox" value="${name}" checked><span>${name}<small> · ${agentRole}</small></span></label>`).join("");

document.querySelector("#role-filters").addEventListener("click", event => {
  const button = event.target.closest("[data-role]"); if (!button) return;
  role = button.dataset.role;
  document.querySelectorAll("[data-role]").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll("[data-agent-role]").forEach(item => item.hidden = role !== "All" && item.dataset.agentRole !== role);
});
document.querySelector("#spin-button").addEventListener("click", spin);
document.querySelector("#save-result").addEventListener("click", async event => {
  if (!current) return;
  event.currentTarget.disabled = true;
  try { await saveRouletteResult(user.uid, current); event.currentTarget.textContent = "Gespeichert ✓"; }
  catch { event.currentTarget.textContent = "Speichern fehlgeschlagen"; event.currentTarget.disabled = false; }
});

async function spin() {
  const enabled = [...toggles.querySelectorAll('input:checked')].filter(input => role === "All" || input.closest("[data-agent-role]").dataset.agentRole === role).map(input => input.value);
  if (!enabled.length) return;
  const button = document.querySelector("#spin-button"); button.disabled = true;
  let ticks = 0;
  const timer = setInterval(() => {
    showAgent(enabled[Math.floor(Math.random() * enabled.length)], "Wird ausgewählt…");
    if (++ticks >= 14) {
      clearInterval(timer);
      const agent = enabled[Math.floor(Math.random() * enabled.length)];
      const mode = document.querySelector("#roulette-mode").value;
      const task = mode === "challenge" ? random(challenges) : mode === "sabotage" ? random(sabotage) : mode === "team" ? "Würfle nacheinander für jedes Teammitglied." : "Viel Erfolg in deinem nächsten Match.";
      current = { agent, role: agents.find(item => item[0] === agent)?.[1], mode, challenge: task };
      showAgent(agent, task);
      button.disabled = false;
      const save = document.querySelector("#save-result");
      save.disabled = false; save.textContent = "Ergebnis speichern";
    }
  }, 70);
}
function showAgent(agent, task) {
  document.querySelector(".agent-monogram").textContent = agent[0];
  document.querySelector("#roulette-result h2").textContent = agent;
  document.querySelector("#challenge-text").textContent = task;
}
function random(items) { return items[Math.floor(Math.random() * items.length)]; }
