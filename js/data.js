import {
  collection, addDoc, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase.js";

const userDoc = (uid, name) => doc(db, "users", uid, name, "current");
const userCollection = (uid, name) => collection(db, "users", uid, name);
const localKey = (uid, name) => `vtrack:${uid}:${name}`;
const localRead = (uid, name, fallback) => {
  try { return JSON.parse(localStorage.getItem(localKey(uid, name))) ?? fallback; }
  catch { return fallback; }
};
const localWrite = (uid, name, value) => localStorage.setItem(localKey(uid, name), JSON.stringify(value));

export async function createUserFoundation(uid, { displayName = "", email = "" } = {}) {
  if (!db) {
    if (!localStorage.getItem(localKey(uid, "profile"))) localWrite(uid, "profile", { displayName, email, riotId: "", region: "eu" });
    if (!localStorage.getItem(localKey(uid, "settings"))) localWrite(uid, "settings", { language: "de", timezone: "Europe/Vienna", showRr: true, saveRoulette: true });
    if (!localStorage.getItem(localKey(uid, "statistics"))) localWrite(uid, "statistics", emptyStatistics());
    if (!localStorage.getItem(localKey(uid, "ranked"))) localWrite(uid, "ranked", { currentRank: "", peakRank: "", rr: null, episode: "", act: "" });
    return;
  }
  const batch = [
    ["profile", { displayName, email, riotId: "", region: "eu", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }],
    ["settings", { language: "de", timezone: "Europe/Vienna", showRr: true, saveRoulette: true, updatedAt: serverTimestamp() }],
    ["statistics", emptyStatistics()],
    ["ranked", { currentRank: "", peakRank: "", rr: null, episode: "", act: "", updatedAt: serverTimestamp() }]
  ];
  await Promise.all(batch.map(async ([name, value]) => {
    const reference = userDoc(uid, name);
    const existing = await getDoc(reference);
    if (!existing.exists()) await setDoc(reference, value);
  }));
}

export async function getUserSection(uid, name) {
  if (!db) return localRead(uid, name, null);
  const snapshot = await getDoc(userDoc(uid, name));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserSection(uid, name, value) {
  if (!db) {
    localWrite(uid, name, { ...(localRead(uid, name, {}) || {}), ...value, updatedAt: Date.now() });
    return;
  }
  await setDoc(userDoc(uid, name), { ...value, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getMatches(uid) {
  if (!db) return localRead(uid, "matches", []).sort((a, b) => (b.playedAt?.seconds || 0) - (a.playedAt?.seconds || 0));
  const snapshot = await getDocs(query(userCollection(uid, "matches"), orderBy("playedAt", "desc"), limit(250)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function addMatch(uid, match) {
  const normalized = {
    schemaVersion: 1,
    source: "manual",
    externalMatchId: null,
    ...match,
    createdAt: db ? serverTimestamp() : Date.now(),
    updatedAt: db ? serverTimestamp() : Date.now()
  };
  if (!db) {
    const matches = await getMatches(uid);
    const id = match.matchId || crypto.randomUUID();
    matches.unshift({ id, ...normalized });
    localWrite(uid, "matches", matches);
    await saveUserSection(uid, "statistics", calculateStatistics(matches));
    await updateRankedFromMatch(uid, normalized);
    return id;
  }
  const result = await addDoc(userCollection(uid, "matches"), normalized);
  const matches = await getMatches(uid);
  await saveUserSection(uid, "statistics", calculateStatistics(matches));
  await updateRankedFromMatch(uid, normalized);
  return result.id;
}

export async function removeMatch(uid, matchId) {
  if (!db) {
    const matches = (await getMatches(uid)).filter(match => match.id !== matchId);
    localWrite(uid, "matches", matches);
    await saveUserSection(uid, "statistics", calculateStatistics(matches));
    return;
  }
  await deleteDoc(doc(db, "users", uid, "matches", matchId));
  const matches = await getMatches(uid);
  await saveUserSection(uid, "statistics", calculateStatistics(matches));
}

export async function saveRouletteResult(uid, result) {
  if (!db) {
    const results = localRead(uid, "roulette", []);
    const id = crypto.randomUUID();
    results.unshift({ id, ...result, source: "manual", createdAt: Date.now() });
    localWrite(uid, "roulette", results);
    return id;
  }
  return addDoc(userCollection(uid, "roulette"), { ...result, source: "manual", createdAt: serverTimestamp() });
}

async function updateRankedFromMatch(uid, match) {
  if (match.gameMode !== "Competitive" || (!match.rankAfter && match.rrAfter === null)) return;
  await saveUserSection(uid, "ranked", {
    currentRank: match.rankAfter || match.rankBefore || "",
    rr: match.rrAfter,
    lastMatchAt: match.playedAt
  });
}

export function emptyStatistics() {
  return {
    totalMatches: 0, wins: 0, losses: 0, winrate: 0, averageKills: 0,
    averageDeaths: 0, averageAssists: 0, averageAcs: 0, averageKda: 0,
    favoriteAgent: "", favoriteMap: "", bestMap: "", worstMap: "",
    longestWinStreak: 0, longestLossStreak: 0
  };
}

export function calculateStatistics(matches) {
  if (!matches.length) return emptyStatistics();
  const total = matches.length;
  const wins = matches.filter(m => m.result === "win").length;
  const sum = key => matches.reduce((value, match) => value + Number(match[key] || 0), 0);
  const average = key => Number((sum(key) / total).toFixed(2));
  const favorite = key => {
    const counts = matches.reduce((all, match) => {
      if (match[key]) all[match[key]] = (all[match[key]] || 0) + 1;
      return all;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  };
  const mapRates = Object.values(matches.reduce((all, match) => {
    if (!match.map) return all;
    all[match.map] ||= { map: match.map, total: 0, wins: 0 };
    all[match.map].total++;
    if (match.result === "win") all[match.map].wins++;
    return all;
  }, {})).filter(item => item.total >= 1).map(item => ({ ...item, rate: item.wins / item.total }));
  const chronological = [...matches].sort((a, b) => (a.playedAt?.seconds || 0) - (b.playedAt?.seconds || 0));
  let winsNow = 0, lossesNow = 0, maxWins = 0, maxLosses = 0;
  chronological.forEach(match => {
    if (match.result === "win") { winsNow++; lossesNow = 0; maxWins = Math.max(maxWins, winsNow); }
    else { lossesNow++; winsNow = 0; maxLosses = Math.max(maxLosses, lossesNow); }
  });
  return {
    totalMatches: total, wins, losses: total - wins,
    winrate: Number(((wins / total) * 100).toFixed(1)),
    averageKills: average("kills"), averageDeaths: average("deaths"),
    averageAssists: average("assists"), averageAcs: average("acs"),
    averageKda: Number(((sum("kills") + sum("assists")) / Math.max(sum("deaths"), 1)).toFixed(2)),
    favoriteAgent: favorite("agent"), favoriteMap: favorite("map"),
    bestMap: [...mapRates].sort((a, b) => b.rate - a.rate)[0]?.map || "",
    worstMap: [...mapRates].sort((a, b) => a.rate - b.rate)[0]?.map || "",
    longestWinStreak: maxWins, longestLossStreak: maxLosses
  };
}
