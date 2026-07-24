import { userReady } from "./app.js";
import { saveChallengeResult } from "./data.js";

const user = await userReady;
const challenges = [
  { type:"solo",level:1,category:"aim",title:"Ruhige Hand",description:"Spiele eine Runde bewusst auf sauberes Crosshair-Placement und vermeide unnötige Sprays." },
  { type:"solo",level:2,category:"aim",title:"Guardian-Fokus",description:"Kaufe in der nächsten vollständigen Buy-Runde eine Guardian und spiele konsequent auf Einzelschüsse." },
  { type:"solo",level:4,category:"aim",title:"One-Tap Mission",description:"Versuche in einer Hälfte mindestens drei Eliminierungen mit kontrollierten Einzelschüssen zu erzielen." },
  { type:"solo",level:1,category:"utility",title:"Nutze dein Kit",description:"Beende keine Runde mit allen Fähigkeiten unbenutzt. Setze mindestens eine Fähigkeit sinnvoll für dein Team ein." },
  { type:"solo",level:3,category:"utility",title:"Setup mit Plan",description:"Entscheide vor jeder Runde, welche Fähigkeit du zuerst einsetzen möchtest, und kommuniziere den Plan." },
  { type:"solo",level:5,category:"utility",title:"Perfektes Timing",description:"Erziele in einer Hälfte mindestens drei Assists durch Fähigkeiten und verschwende keine Ultimate." },
  { type:"solo",level:2,category:"economy",title:"Eco-Disziplin",description:"Kaufe nur dann vollständig, wenn du in der nächsten Runde noch mindestens 1.000 Credits übrig hättest." },
  { type:"solo",level:3,category:"teamplay",title:"Info zuerst",description:"Kommuniziere jeden gesehenen Gegner und jede wichtige Fähigkeit kurz und eindeutig." },
  { type:"solo",level:4,category:"fun",title:"Agenten-Meister",description:"Gewinne eine Runde, in der du jede deiner verfügbaren Fähigkeiten mindestens einmal sinnvoll einsetzt." },
  { type:"team",level:1,category:"teamplay",title:"Positive Comms",description:"Jedes Teammitglied macht nach einer verlorenen Runde eine kurze konstruktive Ansage – kein Blaming." },
  { type:"team",level:3,category:"teamplay",title:"Fünf zusammen",description:"Plant und spielt mindestens drei vollständige Executes, bei denen alle Teammitglieder beteiligt sind." },
  { type:"team",level:5,category:"teamplay",title:"Trade-Maschine",description:"Das Team versucht in einer Hälfte jeden ersten Tod innerhalb von fünf Sekunden zu traden." },
  { type:"team",level:1,category:"economy",title:"Gemeinsamer Einkauf",description:"Niemand kauft allein. Das gesamte Team spielt jede Runde denselben Buy-Typ: Full Buy, Half Buy oder Eco." },
  { type:"team",level:3,category:"utility",title:"Kombo-Runde",description:"Gewinnt eine Runde, in der mindestens zwei verschiedene Agentenfähigkeiten bewusst kombiniert werden." },
  { type:"team",level:5,category:"utility",title:"Ultimate-Orchester",description:"Plant eine Runde mit mindestens drei Ultimates und gewinnt sie, ohne die Ultimates gleichzeitig zu verschwenden." },
  { type:"team",level:2,category:"fun",title:"Bodyguard",description:"Wählt ein Teammitglied als VIP. Gewinnt eine Runde, während der VIP überlebt." },
  { type:"team",level:2,category:"fun",title:"Rollenwechsel",description:"Der gewöhnliche Entry-Spieler spielt eine Runde defensiv, während ein anderes Teammitglied den ersten Kontakt übernimmt." },
  { type:"team",level:4,category:"fun",title:"Flawless Mission",description:"Versucht gemeinsam eine Runde zu gewinnen, ohne dass ein Teammitglied stirbt." }
];

let current = null;
document.querySelector("#draw-challenge").addEventListener("click", draw);
document.querySelector("#reroll-challenge").addEventListener("click", draw);
document.querySelector("#save-challenge").addEventListener("click", save);

function draw() {
  const type = document.querySelector("#challenge-type").value;
  const level = Number(document.querySelector("#challenge-level").value);
  const category = document.querySelector("#challenge-category").value;
  let pool = challenges.filter(item => item.type === type && item.level === level && (category === "all" || item.category === category));
  if (!pool.length) pool = challenges.filter(item => item.type === type && item.level === level);
  current = pool[Math.floor(Math.random() * pool.length)];
  document.querySelector("#challenge-label").textContent = type === "solo" ? "Solo-Challenge" : "Team-Challenge";
  document.querySelector("#challenge-title").textContent = current.title;
  document.querySelector("#challenge-description").textContent = current.description;
  document.querySelector("#challenge-meta").innerHTML = `<span>Level ${current.level}</span><span>${label(current.category)}</span>`;
  document.querySelector("#reroll-challenge").disabled = false;
  document.querySelector("#save-challenge").disabled = false;
  document.querySelector("#challenge-message").hidden = true;
}

async function save() {
  if (!current) return;
  const button = document.querySelector("#save-challenge");
  button.disabled = true;
  try {
    await saveChallengeResult(user.uid, current);
    show("Challenge wurde gespeichert.");
  } catch (error) {
    show("Challenge konnte nicht gespeichert werden.", true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

function show(text, error = false) {
  const element = document.querySelector("#challenge-message");
  element.textContent = text; element.hidden = false; element.classList.toggle("error", error);
}
function label(value) {
  return ({ aim:"Aim",utility:"Fähigkeiten",teamplay:"Teamplay",economy:"Economy",fun:"Fun" })[value] || value;
}
