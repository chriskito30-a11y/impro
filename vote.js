import { db, ref, set, onValue, VOTE_PATH } from "./firebase-config.js";

const voteSubtitle = document.querySelector("#voteSubtitle");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const timerText = document.querySelector("#timerText");
const instructionText = document.querySelector("#instructionText");
const voteTeam1 = document.querySelector("#voteTeam1");
const voteTeam2 = document.querySelector("#voteTeam2");
const voteMessage = document.querySelector("#voteMessage");

const DEVICE_ID_KEY = "improVoteDeviceId";
const VOTED_ROUND_KEY = "improVoteVotedRoundId";
const VOTED_CHOICE_KEY = "improVoteVotedChoice";

const voteRef = ref(db, VOTE_PATH);
let currentVote = null;
let timer = null;
let isSubmitting = false;

function makeDeviceId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = makeDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getRemainingSeconds(data) {
  if (!data?.startedAt || !data?.durationSec) return 0;
  const endAt = data.startedAt + data.durationSec * 1000;
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

function isOpen(data) {
  return Boolean(data?.active) && getRemainingSeconds(data) > 0;
}

function hasAlreadyVoted(data) {
  return Boolean(data?.roundId) && localStorage.getItem(VOTED_ROUND_KEY) === data.roundId;
}

function render() {
  const data = currentVote;

  if (!data?.roundId) {
    statusDot.classList.remove("open");
    statusText.textContent = "En attente";
    timerText.textContent = "--";
    voteSubtitle.textContent = "Attente du lancement par l’arbitre.";
    instructionText.textContent = "Le vote apparaîtra ici dès qu’il sera lancé.";
    voteTeam1.textContent = "Équipe 1";
    voteTeam2.textContent = "Équipe 2";
    voteTeam1.disabled = true;
    voteTeam2.disabled = true;
    voteMessage.textContent = "Un seul vote par appareil et par impro.";
    return;
  }

  const remaining = getRemainingSeconds(data);
  const open = isOpen(data);
  const alreadyVoted = hasAlreadyVoted(data);
  const votedChoice = localStorage.getItem(VOTED_CHOICE_KEY);

  statusDot.classList.toggle("open", open);
  statusText.textContent = open ? "Vote ouvert" : "Vote terminé";
  timerText.textContent = open ? `${remaining}s` : "0s";
  voteTeam1.textContent = data.team1 || "Équipe 1";
  voteTeam2.textContent = data.team2 || "Équipe 2";

  voteTeam1.disabled = !open || alreadyVoted || isSubmitting;
  voteTeam2.disabled = !open || alreadyVoted || isSubmitting;

  if (open && !alreadyVoted) {
    voteSubtitle.textContent = "Choisis l’équipe gagnante de l’improvisation.";
    instructionText.textContent = "Appuie sur un seul bouton. Ton vote sera enregistré immédiatement.";
    voteMessage.textContent = "Vote ouvert. Un seul vote est possible sur cet appareil.";
  } else if (alreadyVoted) {
    const teamName = votedChoice === "team2" ? data.team2 : data.team1;
    voteSubtitle.textContent = "Merci, ton vote est enregistré.";
    instructionText.textContent = "Tu as déjà voté pour cette impro.";
    voteMessage.textContent = `Vote enregistré : ${teamName || "équipe choisie"}.`;
  } else {
    voteSubtitle.textContent = "Le vote est terminé.";
    instructionText.textContent = "Attends la prochaine improvisation.";
    voteMessage.textContent = "Le vote n’est plus ouvert.";
  }
}

async function submitVote(choice) {
  const data = currentVote;
  if (!data?.roundId || !isOpen(data) || hasAlreadyVoted(data) || isSubmitting) return;

  const deviceId = getDeviceId();
  isSubmitting = true;
  render();

  try {
    await set(ref(db, `${VOTE_PATH}/votes/${deviceId}`), {
      choice,
      at: Date.now()
    });

    localStorage.setItem(VOTED_ROUND_KEY, data.roundId);
    localStorage.setItem(VOTED_CHOICE_KEY, choice);
    voteMessage.textContent = "Merci, ton vote est enregistré !";
  } catch (error) {
    console.error(error);
    voteMessage.textContent = "Erreur : vote non enregistré. Vérifie la connexion ou les règles Firebase.";
  } finally {
    isSubmitting = false;
    render();
  }
}

voteTeam1.addEventListener("click", () => submitVote("team1"));
voteTeam2.addEventListener("click", () => submitVote("team2"));

onValue(voteRef, (snapshot) => {
  currentVote = snapshot.val();
  render();
});

timer = setInterval(render, 250);
window.addEventListener("beforeunload", () => clearInterval(timer));
