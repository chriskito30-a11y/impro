import { db, ref, set, update, onValue, VOTE_PATH } from "./firebase-config.js";

const team1Input = document.querySelector("#team1Input");
const team2Input = document.querySelector("#team2Input");
const durationInput = document.querySelector("#durationInput");
const startBtn = document.querySelector("#startBtn");
const closeBtn = document.querySelector("#closeBtn");
const resetBtn = document.querySelector("#resetBtn");
const adminMessage = document.querySelector("#adminMessage");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const timerText = document.querySelector("#timerText");
const summaryText = document.querySelector("#summaryText");
const summaryTeam1 = document.querySelector("#summaryTeam1");
const summaryTeam2 = document.querySelector("#summaryTeam2");
const summaryScore1 = document.querySelector("#summaryScore1");
const summaryScore2 = document.querySelector("#summaryScore2");
const voteUrl = document.querySelector("#voteUrl");
const screenUrl = document.querySelector("#screenUrl");

const voteRef = ref(db, VOTE_PATH);
let currentVote = null;
let timer = null;

voteUrl.textContent = new URL("./vote.html", window.location.href).href;
screenUrl.textContent = new URL("./screen.html", window.location.href).href;

function makeRoundId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function clampDuration(value) {
  const duration = Number.parseInt(value, 10);
  if (!Number.isFinite(duration)) return 30;
  return Math.min(300, Math.max(5, duration));
}

function countVotes(votes = {}) {
  let team1 = 0;
  let team2 = 0;

  Object.values(votes || {}).forEach((vote) => {
    if (vote?.choice === "team1") team1 += 1;
    if (vote?.choice === "team2") team2 += 1;
  });

  return { team1, team2, total: team1 + team2 };
}

function getRemainingSeconds(data) {
  if (!data?.startedAt || !data?.durationSec) return 0;
  const endAt = data.startedAt + data.durationSec * 1000;
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

function isOpen(data) {
  return Boolean(data?.active) && getRemainingSeconds(data) > 0;
}

function render() {
  const data = currentVote;

  if (!data?.roundId) {
    statusDot.classList.remove("open");
    statusText.textContent = "Aucun vote";
    timerText.textContent = "--";
    summaryText.textContent = "Aucun vote en cours.";
    summaryTeam1.textContent = team1Input.value || "Équipe 1";
    summaryTeam2.textContent = team2Input.value || "Équipe 2";
    summaryScore1.textContent = "0";
    summaryScore2.textContent = "0";
    closeBtn.disabled = true;
    return;
  }

  const counts = countVotes(data.votes);
  const remaining = getRemainingSeconds(data);
  const open = isOpen(data);

  team1Input.value = data.team1 || "Équipe 1";
  team2Input.value = data.team2 || "Équipe 2";
  durationInput.value = data.durationSec || 30;

  statusDot.classList.toggle("open", open);
  statusText.textContent = open ? "Vote ouvert" : "Vote terminé";
  timerText.textContent = open ? `${remaining}s` : "0s";
  summaryText.textContent = `${counts.total} vote${counts.total > 1 ? "s" : ""} enregistré${counts.total > 1 ? "s" : ""}.`;
  summaryTeam1.textContent = data.team1 || "Équipe 1";
  summaryTeam2.textContent = data.team2 || "Équipe 2";
  summaryScore1.textContent = counts.team1;
  summaryScore2.textContent = counts.team2;
  closeBtn.disabled = !open;
}

onValue(voteRef, (snapshot) => {
  currentVote = snapshot.val();
  render();
});

timer = setInterval(render, 250);

startBtn.addEventListener("click", async () => {
  const team1 = team1Input.value.trim() || "Équipe 1";
  const team2 = team2Input.value.trim() || "Équipe 2";
  const durationSec = clampDuration(durationInput.value);
  const now = Date.now();

  startBtn.disabled = true;
  adminMessage.textContent = "Lancement du vote…";

  try {
    await set(voteRef, {
      roundId: makeRoundId(),
      active: true,
      status: "open",
      team1,
      team2,
      durationSec,
      startedAt: now,
      endedAt: now + durationSec * 1000,
      votes: {}
    });
    adminMessage.textContent = `Vote lancé pour ${durationSec} secondes.`;
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Erreur : impossible de lancer le vote. Vérifie les règles Firebase.";
  } finally {
    startBtn.disabled = false;
  }
});

closeBtn.addEventListener("click", async () => {
  adminMessage.textContent = "Clôture du vote…";

  try {
    await update(voteRef, {
      active: false,
      status: "closed",
      endedAt: Date.now()
    });
    adminMessage.textContent = "Vote clôturé.";
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Erreur : impossible de clôturer le vote.";
  }
});

resetBtn.addEventListener("click", async () => {
  adminMessage.textContent = "Réinitialisation…";

  try {
    await set(voteRef, {
      roundId: null,
      active: false,
      status: "idle",
      team1: team1Input.value.trim() || "Équipe 1",
      team2: team2Input.value.trim() || "Équipe 2",
      durationSec: clampDuration(durationInput.value),
      startedAt: null,
      endedAt: null,
      votes: {}
    });
    adminMessage.textContent = "Réinitialisé. Tu peux lancer une nouvelle impro.";
  } catch (error) {
    console.error(error);
    adminMessage.textContent = "Erreur : impossible de réinitialiser.";
  }
});

window.addEventListener("beforeunload", () => clearInterval(timer));
