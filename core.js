import { db, ref, get, set } from "./firebase-config.js";

export const DEFAULT_CONFIG = {
  title: "Match d'improvisation",
  subtitle: "Vote du public",
  mainImage: "",
  team1Name: "Équipe 1",
  team1Image: "",
  team2Name: "Équipe 2",
  team2Image: "",
  durationSec: 30,
  updatedAt: 0
};

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function normalizeRoomId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function getRoomIdFromUrl() {
  return normalizeRoomId(new URLSearchParams(window.location.search).get("room"));
}

export function roomPath(roomId, suffix = "") {
  const clean = normalizeRoomId(roomId);
  const cleanSuffix = String(suffix || "").replace(/^\/+/, "");
  return cleanSuffix ? `rooms/${clean}/${cleanSuffix}` : `rooms/${clean}`;
}

export function publicUrl(page, roomId) {
  const url = new URL(page, window.location.href);
  url.searchParams.set("room", normalizeRoomId(roomId));
  return url.href;
}

export function randomRoomId() {
  const words = ["impro", "match", "show", "scene", "finale", "public", "duel", "cabaret"];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = Math.random().toString(36).slice(2, 7);
  return `${word}-${code}`;
}

export function clampDuration(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(300, Math.max(5, n));
}

export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function makeSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashRoomPassword(roomId, password, salt) {
  return sha256(`${normalizeRoomId(roomId)}|${salt}|${password}`);
}

export async function ensureRoom(roomId, password) {
  const clean = normalizeRoomId(roomId);
  if (!clean) throw new Error("Nom de salle invalide.");
  if (!password || password.length < 4) throw new Error("Choisis un mot de passe d'au moins 4 caractères.");

  const roomRef = ref(db, roomPath(clean));
  const snap = await get(roomRef);

  if (snap.exists()) {
    return { roomId: clean, created: false };
  }

  const salt = makeSalt();
  const passwordHash = await hashRoomPassword(clean, password, salt);
  const now = Date.now();

  await set(roomRef, {
    config: {
      ...DEFAULT_CONFIG,
      updatedAt: now
    },
    currentVote: {
      active: false,
      roundId: "",
      startedAt: 0,
      durationSec: DEFAULT_CONFIG.durationSec,
      votes: {}
    },
    private: {
      salt,
      passwordHash,
      createdAt: now
    }
  });

  return { roomId: clean, created: true };
}

export async function verifyRoomPassword(roomId, password) {
  const clean = normalizeRoomId(roomId);
  const snap = await get(ref(db, roomPath(clean, "private")));
  if (!snap.exists()) return false;
  const data = snap.val() || {};
  if (!data.salt || !data.passwordHash) return false;
  const attempt = await hashRoomPassword(clean, password, data.salt);
  return attempt === data.passwordHash;
}

export function rememberPassword(roomId, password) {
  sessionStorage.setItem(`improVotePassword:${normalizeRoomId(roomId)}`, password);
}

export function getRememberedPassword(roomId) {
  return sessionStorage.getItem(`improVotePassword:${normalizeRoomId(roomId)}`) || "";
}

export function forgetPassword(roomId) {
  sessionStorage.removeItem(`improVotePassword:${normalizeRoomId(roomId)}`);
}

export function safeConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...(config || {}),
    durationSec: clampDuration(config?.durationSec ?? DEFAULT_CONFIG.durationSec)
  };
}

export function countVotes(currentVote = {}) {
  const votes = currentVote?.votes || {};
  let team1 = 0;
  let team2 = 0;

  Object.values(votes).forEach((vote) => {
    const choice = typeof vote === "string" ? vote : vote?.choice;
    if (choice === "team1") team1 += 1;
    if (choice === "team2") team2 += 1;
  });

  return { team1, team2, total: team1 + team2 };
}

export function remainingSeconds(currentVote = {}) {
  if (!currentVote?.active || !currentVote?.startedAt || !currentVote?.durationSec) return 0;
  const end = Number(currentVote.startedAt) + Number(currentVote.durationSec) * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

export function isVoteOpen(currentVote = {}) {
  return Boolean(currentVote?.active && remainingSeconds(currentVote) > 0);
}

export function getDeviceId() {
  const key = "improVoteDeviceId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function votedKey(roomId) {
  return `improVoteVoted:${normalizeRoomId(roomId)}`;
}

export function getVotedRound(roomId) {
  try {
    return JSON.parse(localStorage.getItem(votedKey(roomId)) || "null");
  } catch {
    return null;
  }
}

export function setVotedRound(roomId, roundId, choice) {
  localStorage.setItem(votedKey(roomId), JSON.stringify({ roundId, choice, at: Date.now() }));
}

export function setText(selector, text, root = document) {
  const el = $(selector, root);
  if (el) el.textContent = text;
}

export function setOptionalImage(imgEl, url, alt = "") {
  if (!imgEl) return;
  const clean = String(url || "").trim();
  imgEl.alt = alt || "Image";

  if (!clean) {
    imgEl.hidden = true;
    imgEl.removeAttribute("src");
    imgEl.dataset.currentSrc = "";
    return;
  }

  if (imgEl.dataset.currentSrc === clean) {
    if (imgEl.complete && imgEl.naturalWidth > 0) imgEl.hidden = false;
    return;
  }

  imgEl.hidden = true;
  imgEl.dataset.currentSrc = clean;
  imgEl.onload = () => {
    imgEl.hidden = false;
    imgEl.classList.remove("image-broken");
  };
  imgEl.onerror = () => {
    imgEl.hidden = true;
    imgEl.classList.add("image-broken");
  };
  imgEl.src = clean;
}

export function winnerLabel(counts, config) {
  if (counts.team1 === counts.team2) return "Égalité";
  return counts.team1 > counts.team2 ? config.team1Name : config.team2Name;
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export function formatTimer(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
