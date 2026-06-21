import { db, ref, update, set, onValue } from "./firebase-config.js";
import {
  $,
  getRoomIdFromUrl,
  getRememberedPassword,
  rememberPassword,
  verifyRoomPassword,
  roomPath,
  safeConfig,
  countVotes,
  remainingSeconds,
  isVoteOpen,
  formatTimer,
  publicUrl
} from "./core.js";
import { enforceModuleAccess } from "./modulys-access.js";
const __modulysAccessOk = await enforceModuleAccess("improvote", { mode: "hard" });
if (!__modulysAccessOk) throw new Error("Modulys access denied");


const roomId = getRoomIdFromUrl();
let config = safeConfig();
let currentVote = { active: false, votes: {} };
let timerId = null;

const missingRoom = $("#missingRoom");
const authPanel = $("#authPanel");
const adminPanel = $("#adminPanel");
const authForm = $("#authForm");
const authPassword = $("#authPassword");
const authError = $("#authError");

if (!roomId) {
  missingRoom.hidden = false;
} else {
  $("#authRoomName").textContent = roomId;
  bootAuth();
}

async function bootAuth() {
  const remembered = getRememberedPassword(roomId);
  if (remembered && await verifyRoomPassword(roomId, remembered)) {
    openAdmin();
    return;
  }
  authPanel.hidden = false;
  authPassword.focus();
}

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";
  const password = authPassword.value;
  const ok = await verifyRoomPassword(roomId, password);
  if (!ok) {
    authError.textContent = "Mot de passe incorrect.";
    return;
  }
  rememberPassword(roomId, password);
  openAdmin();
});

function openAdmin() {
  authPanel.hidden = true;
  adminPanel.hidden = false;
  $("#settingsLink").href = publicUrl("settings.html", roomId);
  $("#screenLink").href = publicUrl("screen.html", roomId);
  $("#voteLink").href = publicUrl("vote.html", roomId);

  onValue(ref(db, roomPath(roomId, "config")), (snap) => {
    config = safeConfig(snap.val() || {});
    render();
  });

  onValue(ref(db, roomPath(roomId, "currentVote")), (snap) => {
    currentVote = snap.val() || { active: false, votes: {} };
    render();
  });

  timerId = setInterval(render, 300);
}

$("#startVoteBtn")?.addEventListener("click", async () => {
  const now = Date.now();
  const roundId = String(now);
  await set(ref(db, roomPath(roomId, "currentVote")), {
    active: true,
    roundId,
    startedAt: now,
    durationSec: config.durationSec,
    votes: {}
  });
});

$("#closeVoteBtn")?.addEventListener("click", async () => {
  await update(ref(db, roomPath(roomId, "currentVote")), { active: false });
});

$("#resetVoteBtn")?.addEventListener("click", async () => {
  await set(ref(db, roomPath(roomId, "currentVote")), {
    active: false,
    roundId: "",
    startedAt: 0,
    durationSec: config.durationSec,
    votes: {}
  });
});

function render() {
  const counts = countVotes(currentVote);
  const remaining = remainingSeconds(currentVote);
  const open = isVoteOpen(currentVote);
  const expired = currentVote?.active && remaining <= 0;

  $("#adminTitle").textContent = config.title;
  $("#adminSubtitle").textContent = `${config.subtitle} · ${config.durationSec}s`;
  $("#team1AdminName").textContent = config.team1Name;
  $("#team2AdminName").textContent = config.team2Name;
  $("#team1AdminScore").textContent = counts.team1;
  $("#team2AdminScore").textContent = counts.team2;
  $("#totalVotes").textContent = `${counts.total} vote${counts.total > 1 ? "s" : ""}`;
  $("#timerOrb").textContent = open || expired ? formatTimer(remaining) : "--";

  if (open) {
    $("#voteState").textContent = "Vote en cours";
    $("#voteInfo").textContent = "Le public peut voter maintenant.";
  } else if (expired) {
    $("#voteState").textContent = "Temps écoulé";
    $("#voteInfo").textContent = "Le vote est terminé côté public. Tu peux clôturer ou relancer.";
  } else {
    $("#voteState").textContent = "Vote fermé";
    $("#voteInfo").textContent = "Lance un vote pour la prochaine improvisation.";
  }
}

window.addEventListener("beforeunload", () => {
  if (timerId) clearInterval(timerId);
});
