import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, isFirebaseConfigured } from "./firebase.js";

// Interne Buildnummer. Sie wird absichtlich nicht in der Oberfläche angezeigt.
const CURRENT_BUILD = "1.0.0";

export async function checkForAppUpdate() {
  if (!isFirebaseConfigured || !db) return;
  try {
    const snapshot = await getDoc(doc(db, "appConfig", "public"));
    if (!snapshot.exists()) return;
    const remoteBuild = String(snapshot.data().version || "").trim();
    if (!remoteBuild || !isNewer(remoteBuild, CURRENT_BUILD)) return;

    const reloadKey = `vtrack-update-${remoteBuild}`;
    if (sessionStorage.getItem(reloadKey)) return;
    sessionStorage.setItem(reloadKey, "checked");

    const url = new URL(window.location.href);
    url.searchParams.set("appv", remoteBuild);
    window.location.replace(url.toString());
  } catch {
    // Die App bleibt auch bei fehlender Verbindung vollständig verwendbar.
  }
}

function isNewer(remote, local) {
  const normalize = value => value.split(".").map(part => Number.parseInt(part, 10) || 0);
  const remoteParts = normalize(remote);
  const localParts = normalize(local);
  const length = Math.max(remoteParts.length, localParts.length);
  for (let index = 0; index < length; index++) {
    const difference = (remoteParts[index] || 0) - (localParts[index] || 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}
