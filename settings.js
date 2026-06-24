import { db, ref, get, update } from "./firebase-config.js";
import {
  $,
  $all,
  getRoomIdFromUrl,
  getRememberedPassword,
  rememberPassword,
  verifyRoomPassword,
  roomPath,
  safeConfig,
  clampDuration,
  setOptionalImage,
  publicUrl,
  qrCodeUrl,
  copyToClipboard,
  friendlyErrorMessage
} from "./core.js";
import { enforceModuleAccess } from "./modulys-access.js";
const __modulysAccessOk = await enforceModuleAccess("improvote", { mode: "hard" });
if (!__modulysAccessOk) throw new Error("Accès non autorisé");


const roomId = getRoomIdFromUrl();
const missingRoom = $("#missingRoom");
const authPanel = $("#authPanel");
const settingsPanel = $("#settingsPanel");
const authForm = $("#authForm");
const authPassword = $("#authPassword");
const authError = $("#authError");
const authRoomName = $("#authRoomName");
const form = $("#settingsForm");
const saveStatus = $("#saveStatus");

const fields = {
  title: $("#titleInput"),
  subtitle: $("#subtitleInput"),
  mainImage: $("#mainImageInput"),
  team1Name: $("#team1NameInput"),
  team1Image: $("#team1ImageInput"),
  team2Name: $("#team2NameInput"),
  team2Image: $("#team2ImageInput"),
  durationSec: $("#durationInput")
};

if (!roomId) {
  missingRoom.hidden = false;
} else {
  authRoomName.textContent = roomId;
  bootAuth();
}

async function bootAuth() {
  const remembered = getRememberedPassword(roomId);
  if (remembered && await verifyRoomPassword(roomId, remembered)) {
    openSettings();
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
  openSettings();
});

async function openSettings() {
  authPanel.hidden = true;
  settingsPanel.hidden = false;
  $("#pageTitle").textContent = `Configuration · ${roomId}`;
  $("#openAdminLink").href = publicUrl("admin.html", roomId);
  fillLinks();
  await loadConfig();
  bindPreview();
}

async function loadConfig() {
  const snap = await get(ref(db, roomPath(roomId, "config")));
  const config = safeConfig(snap.val() || {});

  fields.title.value = config.title;
  fields.subtitle.value = config.subtitle;
  fields.mainImage.value = config.mainImage;
  fields.team1Name.value = config.team1Name;
  fields.team1Image.value = config.team1Image;
  fields.team2Name.value = config.team2Name;
  fields.team2Image.value = config.team2Image;
  fields.durationSec.value = config.durationSec;

  updatePreview();
}

function fillLinks() {
  const links = {
    vote: {
      url: publicUrl("vote.html", roomId),
      input: "voteLink",
      open: "voteOpenLink",
      qr: "voteQr",
      qrLink: "voteQrLink"
    },
    screen: {
      url: publicUrl("screen.html", roomId),
      input: "screenLink",
      open: "screenOpenLink",
      qr: "screenQr",
      qrLink: "screenQrLink"
    },
    admin: {
      url: publicUrl("admin.html", roomId),
      input: "adminLinkInput",
      open: "adminOpenLink",
      qr: "adminQr",
      qrLink: "adminQrLink"
    },
    settings: {
      url: publicUrl("settings.html", roomId),
      input: "settingsLinkInput",
      open: "settingsOpenLink",
      qr: "settingsQr",
      qrLink: "settingsQrLink"
    }
  };

  Object.values(links).forEach((item) => {
    const input = $(`#${item.input}`);
    const open = $(`#${item.open}`);
    const qr = $(`#${item.qr}`);
    const qrLink = $(`#${item.qrLink}`);

    if (input) input.value = item.url;
    if (open) open.href = item.url;
    if (qrLink) qrLink.href = item.url;
    if (qr) qr.src = qrCodeUrl(item.url, 240);
  });
}

function bindPreview() {
  Object.values(fields).forEach((field) => field.addEventListener("input", updatePreview));

  $all("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const input = $(`#${button.dataset.copy}`);
      await copyToClipboard(input.value);
      const old = button.textContent;
      button.textContent = "Copié";
      setTimeout(() => button.textContent = old, 1200);
    });
  });
}

function updatePreview() {
  const title = fields.title.value.trim() || "Match d'improvisation";
  const subtitle = fields.subtitle.value.trim() || "Vote du public";
  const team1 = fields.team1Name.value.trim() || "Équipe 1";
  const team2 = fields.team2Name.value.trim() || "Équipe 2";

  $("#previewTitle").textContent = title;
  $("#previewSubtitle").textContent = subtitle;
  $("#team1PreviewName").textContent = team1;
  $("#team2PreviewName").textContent = team2;
  setOptionalImage($("#mainPreview"), fields.mainImage.value, title);
  setOptionalImage($("#team1Preview"), fields.team1Image.value, team1);
  setOptionalImage($("#team2Preview"), fields.team2Image.value, team2);
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveStatus.textContent = "Enregistrement...";
  saveStatus.className = "status-text";

  const payload = {
    title: fields.title.value.trim() || "Match d'improvisation",
    subtitle: fields.subtitle.value.trim() || "Vote du public",
    mainImage: fields.mainImage.value.trim(),
    team1Name: fields.team1Name.value.trim() || "Équipe 1",
    team1Image: fields.team1Image.value.trim(),
    team2Name: fields.team2Name.value.trim() || "Équipe 2",
    team2Image: fields.team2Image.value.trim(),
    durationSec: clampDuration(fields.durationSec.value),
    updatedAt: Date.now()
  };

  try {
    await update(ref(db, roomPath(roomId, "config")), payload);
    await update(ref(db, roomPath(roomId, "currentVote")), { durationSec: payload.durationSec });
    saveStatus.textContent = "Réglages enregistrés.";
    saveStatus.className = "status-text success";
  } catch (error) {
    saveStatus.textContent = friendlyErrorMessage(error, "Erreur lors de l'enregistrement.");
    saveStatus.className = "status-text error";
  }
});
