import { auth, isFirebaseConfigured } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { createUserFoundation, getUserSection, saveUserSection } from "./data.js";

const page = document.body.dataset.page;
const labels = { dashboard: "Dashboard", matches: "Matches", roulette: "Roulette", challenges: "Challenges", statistics: "Statistiken", ranked: "Ranked", profile: "Profil", settings: "Einstellungen" };
const links = [
  ["dashboard", "dashboard.html"], ["matches", "matches.html"], ["roulette", "roulette.html"], ["challenges", "challenges.html"],
  ["statistics", "statistik.html"], ["ranked", "ranked.html"], ["profile", "profil.html"], ["settings", "einstellungen.html"]
];

const shell = document.querySelector("#app-shell");
if (shell) shell.innerHTML = `<header class="app-header">
  <a class="brand" href="dashboard.html"><span class="brand-mark">V</span><span>TRACK</span></a>
  <nav class="main-nav" aria-label="Hauptnavigation">${links.map(([key, url]) => `<a href="${url}" data-nav-key="${key}" class="${page === key ? "active" : ""}">${labels[key]}</a>`).join("")}<span class="nav-indicator" aria-hidden="true"></span></nav>
  <div class="user-menu"><span data-user-name>Spieler</span><div class="avatar" data-user-initial>V</div><button class="icon-button" id="logout-button" title="Abmelden" aria-label="Abmelden">↪</button></div>
</header>`;

initNavigationMotion();

document.body.insertAdjacentHTML("beforeend", `<footer class="site-footer"><div class="footer-inner">
  <span>© ${new Date().getFullYear()} V-Track · Unabhängiges Community-Projekt</span>
  <nav class="footer-links" aria-label="Rechtliche Informationen">
    <a href="ueber.html">Über V-Track</a><a href="datenschutz.html">Datenschutz</a>
    <a href="nutzungsbedingungen.html">Nutzungsbedingungen</a><a href="impressum.html">Impressum</a>
    <a href="kontakt.html">Kontakt</a>
  </nav>
</div></footer>`);

export const userReady = new Promise(resolve => {
  if (!isFirebaseConfigured) {
    window.location.replace("index.html");
    return;
  }
  onAuthStateChanged(auth, async user => {
    if (!user) {
      window.location.replace("index.html");
      return;
    }
    document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = user.displayName || "Spieler");
    document.querySelectorAll("[data-user-email]").forEach(el => el.textContent = user.email || "");
    document.querySelectorAll("[data-user-initial]").forEach(el => el.textContent = (user.displayName || user.email || "V")[0].toUpperCase());
    try { await createUserFoundation(user.uid, { displayName: user.displayName || "", email: user.email || "" }); } catch (error) { console.warn(error); }
    resolve(user);
  });
});

document.querySelector("#logout-button")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("index.html");
});

initProfile();
initSettings();

async function initProfile() {
  const form = document.querySelector("#profile-form");
  if (!form) return;
  const user = await userReady;
  const profile = await getUserSection(user.uid, "profile");
  form.displayName.value = profile?.displayName || user.displayName || "";
  form.riotId.value = profile?.riotId || "";
  form.region.value = profile?.region || "eu";
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      await Promise.all([saveUserSection(user.uid, "profile", data), updateProfile(user, { displayName: data.displayName })]);
      showFormMessage(form, "Profil gespeichert.");
      document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = data.displayName);
    } catch { showFormMessage(form, "Profil konnte nicht gespeichert werden.", true); }
  });
}

async function initSettings() {
  const form = document.querySelector("#settings-form");
  if (!form) return;
  const user = await userReady;
  const settings = await getUserSection(user.uid, "settings");
  if (settings) {
    form.language.value = settings.language || "de"; form.timezone.value = settings.timezone || "Europe/Vienna";
    form.showRr.checked = settings.showRr !== false; form.saveRoulette.checked = settings.saveRoulette !== false;
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = { language: form.language.value, timezone: form.timezone.value, showRr: form.showRr.checked, saveRoulette: form.saveRoulette.checked };
    try { await saveUserSection(user.uid, "settings", data); showFormMessage(form, "Einstellungen gespeichert."); }
    catch { showFormMessage(form, "Einstellungen konnten nicht gespeichert werden.", true); }
  });
}

function showFormMessage(form, text, error = false) {
  const el = form.querySelector(".message"); el.textContent = text; el.hidden = false; el.classList.toggle("error", error);
}

function initNavigationMotion() {
  const nav = document.querySelector(".main-nav");
  const indicator = document.querySelector(".nav-indicator");
  const active = nav?.querySelector("a.active");
  if (!nav || !indicator || !active) return;

  const moveIndicator = (element, animate = true) => {
    if (!animate) indicator.style.transition = "none";
    indicator.style.width = `${element.offsetWidth}px`;
    indicator.style.transform = `translateX(${element.offsetLeft}px)`;
    if (!animate) requestAnimationFrame(() => indicator.style.removeProperty("transition"));
  };

  try {
    const previous = JSON.parse(sessionStorage.getItem("vtrackNavPosition") || "null");
    if (previous) {
      indicator.style.width = `${previous.width}px`;
      indicator.style.transform = `translateX(${previous.left}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => moveIndicator(active)));
    } else {
      moveIndicator(active, false);
    }
  } catch {
    moveIndicator(active, false);
  }

  active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    sessionStorage.setItem("vtrackNavPosition", JSON.stringify({
      left: link.offsetLeft,
      width: link.offsetWidth
    }));
    moveIndicator(link);
    document.body.classList.add("page-leaving");
    window.setTimeout(() => window.location.href = link.href, 170);
  }));

  window.addEventListener("resize", () => moveIndicator(active, false));
}
