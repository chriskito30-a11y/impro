import { db, ref, onValue } from "./firebase-config.js";
import {
  $,
  getRoomIdFromUrl,
  roomPath,
  safeConfig,
  countVotes,
  remainingSeconds,
  isVoteOpen,
  formatTimer,
  setOptionalImage,
  winnerLabel
} from "./core.js";

const roomId = getRoomIdFromUrl();
let config = safeConfig();
let currentVote = { active: false, roundId: "", votes: {} };
let previousCounts = { team1: 0, team2: 0, total: 0 };
let previousRoundId = "";
let hasRendered = false;
let tick = null;

if (!roomId) {
  $("#missingRoom").hidden = false;
} else {
  $("#screenContent").hidden = false;
  bind();
}

function bind() {
  onValue(ref(db, roomPath(roomId, "config")), (snap) => {
    config = safeConfig(snap.val() || {});
    render();
  });

  onValue(ref(db, roomPath(roomId, "currentVote")), (snap) => {
    currentVote = snap.val() || { active: false, roundId: "", votes: {} };
    const counts = countVotes(currentVote);

    if (currentVote.roundId && currentVote.roundId !== previousRoundId) {
      previousRoundId = currentVote.roundId;
      previousCounts = counts;
      hasRendered = true;
    } else if (hasRendered) {
      if (counts.team1 > previousCounts.team1) flashPlus("team1", counts.team1 - previousCounts.team1);
      if (counts.team2 > previousCounts.team2) flashPlus("team2", counts.team2 - previousCounts.team2);
      previousCounts = counts;
    } else {
      previousCounts = counts;
      hasRendered = true;
    }

    render();
  });

  tick = setInterval(render, 250);
}

function flashPlus(team, delta = 1) {
  const el = team === "team1" ? $("#team1Plus") : $("#team2Plus");
  const card = team === "team1" ? $("#team1Card") : $("#team2Card");
  el.textContent = `+${delta}`;
  el.classList.remove("show-plus");
  card.classList.remove("score-bump");
  void el.offsetWidth;
  el.classList.add("show-plus");
  card.classList.add("score-bump");
}

function render() {
  const counts = countVotes(currentVote);
  const remaining = remainingSeconds(currentVote);
  const open = isVoteOpen(currentVote);
  const expired = currentVote?.active && remaining <= 0;
  const duration = Number(currentVote?.durationSec || config.durationSec || 30);
  const progress = open || expired ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;

  $("#screenTitle").textContent = config.title;
  $("#screenSubtitle").textContent = config.subtitle;
  $("#team1ScreenName").textContent = config.team1Name;
  $("#team2ScreenName").textContent = config.team2Name;
  $("#team1Score").textContent = counts.team1;
  $("#team2Score").textContent = counts.team2;
  $("#totalScreenVotes").textContent = `${counts.total} vote${counts.total > 1 ? "s" : ""}`;
  $("#progressBar").style.width = `${progress}%`;

  setOptionalImage($("#screenMainImage"), config.mainImage, config.title);
  setOptionalImage($("#team1ScreenImage"), config.team1Image, config.team1Name);
  setOptionalImage($("#team2ScreenImage"), config.team2Image, config.team2Name);

  $("#team1Card").classList.toggle("leading", counts.team1 > counts.team2);
  $("#team2Card").classList.toggle("leading", counts.team2 > counts.team1);

  if (open) {
    $("#screenStatus").textContent = "Vote en cours";
    $("#screenTimer").textContent = formatTimer(remaining);
    $("#winnerText").textContent = "";
    document.body.classList.add("vote-live");
    document.body.classList.remove("vote-ended");
  } else if (expired || currentVote?.roundId) {
    $("#screenStatus").textContent = "Vote terminé";
    $("#screenTimer").textContent = "FIN";
    $("#winnerText").textContent = counts.total ? `Résultat : ${winnerLabel(counts, config)}` : "Aucun vote";
    document.body.classList.remove("vote-live");
    document.body.classList.add("vote-ended");
  } else {
    $("#screenStatus").textContent = "En attente du vote";
    $("#screenTimer").textContent = "--";
    $("#winnerText").textContent = "";
    document.body.classList.remove("vote-live", "vote-ended");
  }
}

window.addEventListener("beforeunload", () => {
  if (tick) clearInterval(tick);
});
