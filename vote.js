import { db, ref, set, onValue } from "./firebase-config.js";
import {
  $,
  getRoomIdFromUrl,
  roomPath,
  safeConfig,
  remainingSeconds,
  isVoteOpen,
  formatTimer,
  getDeviceId,
  getVotedRound,
  setVotedRound,
  setOptionalImage
} from "./core.js";

const roomId = getRoomIdFromUrl();
let config = safeConfig();
let currentVote = { active: false, roundId: "", votes: {} };
let tick = null;

if (!roomId) {
  $("#missingRoom").hidden = false;
} else {
  $("#votePanel").hidden = false;
  bind();
}

function bind() {
  onValue(ref(db, roomPath(roomId, "config")), (snap) => {
    config = safeConfig(snap.val() || {});
    render();
  });

  onValue(ref(db, roomPath(roomId, "currentVote")), (snap) => {
    currentVote = snap.val() || { active: false, roundId: "", votes: {} };
    render();
  });

  $("#team1Button").addEventListener("click", () => vote("team1"));
  $("#team2Button").addEventListener("click", () => vote("team2"));

  tick = setInterval(render, 250);
}

async function vote(choice) {
  if (!isVoteOpen(currentVote)) return;

  const voted = getVotedRound(roomId);
  if (voted?.roundId === currentVote.roundId) {
    render();
    return;
  }

  const deviceId = getDeviceId();
  await set(ref(db, roomPath(roomId, `currentVote/votes/${deviceId}`)), {
    choice,
    at: Date.now()
  });
  setVotedRound(roomId, currentVote.roundId, choice);
  render();
}

function render() {
  const remaining = remainingSeconds(currentVote);
  const open = isVoteOpen(currentVote);
  const voted = getVotedRound(roomId);
  const alreadyVoted = voted?.roundId && voted.roundId === currentVote?.roundId;

  $("#voteTitle").textContent = config.title;
  $("#voteSubtitle").textContent = config.subtitle;
  $("#team1VoteName").textContent = config.team1Name;
  $("#team2VoteName").textContent = config.team2Name;

  setOptionalImage($("#voteMainImage"), config.mainImage, config.title);
  setOptionalImage($("#team1VoteImage"), config.team1Image, config.team1Name);
  setOptionalImage($("#team2VoteImage"), config.team2Image, config.team2Name);

  $("#team1Button").disabled = !open || alreadyVoted;
  $("#team2Button").disabled = !open || alreadyVoted;

  if (alreadyVoted) {
    const team = voted.choice === "team1" ? config.team1Name : config.team2Name;
    $("#voteTimer").textContent = open ? formatTimer(remaining) : "Terminé";
    $("#voteMessage").textContent = `Vote enregistré pour ${team}. Merci !`;
    document.body.classList.add("has-voted");
    return;
  }

  document.body.classList.remove("has-voted");

  if (open) {
    $("#voteTimer").textContent = formatTimer(remaining);
    $("#voteMessage").textContent = "Choisis l'équipe qui remporte l'impro.";
  } else if (currentVote?.active && remaining <= 0) {
    $("#voteTimer").textContent = "Terminé";
    $("#voteMessage").textContent = "Le temps de vote est terminé.";
  } else {
    $("#voteTimer").textContent = "En attente";
    $("#voteMessage").textContent = "Attends que l'arbitre lance le vote.";
  }
}

window.addEventListener("beforeunload", () => {
  if (tick) clearInterval(tick);
});
