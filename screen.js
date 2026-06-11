import { db, ref, onValue, VOTE_PATH } from "./firebase-config.js";

const screenTitle = document.querySelector("#screenTitle");
const screenSubtitle = document.querySelector("#screenSubtitle");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const timerText = document.querySelector("#timerText");
const team1Name = document.querySelector("#team1Name");
const team2Name = document.querySelector("#team2Name");
const team1Score = document.querySelector("#team1Score");
const team2Score = document.querySelector("#team2Score");
const plusTeam1 = document.querySelector("#plusTeam1");
const plusTeam2 = document.querySelector("#plusTeam2");
const winnerBox = document.querySelector("#winnerBox");

const voteRef = ref(db, VOTE_PATH);
let currentVote = null;
let previousCounts = { team1: 0, team2: 0 };
let hasInitialRender = false;
let timer = null;

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

function showPlus(element, amount) {
  element.textContent = `+${amount}`;
  element.classList.remove("show");
  void element.offsetWidth;
  element.classList.add("show");
}

function getWinnerText(data, counts) {
  if (counts.total === 0) return "Aucun vote enregistré.";
  if (counts.team1 > counts.team2) return `Victoire : ${data.team1 || "Équipe 1"}`;
  if (counts.team2 > counts.team1) return `Victoire : ${data.team2 || "Équipe 2"}`;
  return "Égalité !";
}

function render() {
  const data = currentVote;

  if (!data?.roundId) {
    screenTitle.textContent = "En attente du vote";
    screenSubtitle.textContent = "L’arbitre doit lancer une nouvelle session.";
    statusDot.classList.remove("open");
    statusText.textContent = "Aucun vote";
    timerText.textContent = "--";
    team1Name.textContent = "Équipe 1";
    team2Name.textContent = "Équipe 2";
    team1Score.textContent = "0";
    team2Score.textContent = "0";
    winnerBox.hidden = true;
    previousCounts = { team1: 0, team2: 0 };
    hasInitialRender = false;
    return;
  }

  const counts = countVotes(data.votes);
  const open = isOpen(data);
  const remaining = getRemainingSeconds(data);

  if (hasInitialRender) {
    const diff1 = counts.team1 - previousCounts.team1;
    const diff2 = counts.team2 - previousCounts.team2;
    if (diff1 > 0) showPlus(plusTeam1, diff1);
    if (diff2 > 0) showPlus(plusTeam2, diff2);
  }

  previousCounts = counts;
  hasInitialRender = true;

  screenTitle.textContent = open ? "Vote en cours" : "Vote terminé";
  screenSubtitle.textContent = open
    ? "Les résultats se mettent à jour en direct."
    : `${counts.total} vote${counts.total > 1 ? "s" : ""} enregistré${counts.total > 1 ? "s" : ""}.`;

  statusDot.classList.toggle("open", open);
  statusText.textContent = open ? "Vote ouvert" : "Vote fermé";
  timerText.textContent = open ? `${remaining}s` : "0s";
  team1Name.textContent = data.team1 || "Équipe 1";
  team2Name.textContent = data.team2 || "Équipe 2";
  team1Score.textContent = counts.team1;
  team2Score.textContent = counts.team2;

  winnerBox.hidden = open;
  if (!open) winnerBox.textContent = getWinnerText(data, counts);
}

onValue(voteRef, (snapshot) => {
  currentVote = snapshot.val();
  render();
});

timer = setInterval(render, 250);
window.addEventListener("beforeunload", () => clearInterval(timer));
