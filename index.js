import { enforceModuleAccess, assertCanCreateModuleEvent, buildModuleEntityMeta, recordModuleEventUsage } from "./modulys-access.js";
import { $, normalizeRoomId, randomRoomId, ensureRoom, verifyRoomPassword, rememberPassword, publicUrl } from "./core.js";
const __modulysAccessOk = await enforceModuleAccess("improvote", { mode: "hard" });
if (!__modulysAccessOk) throw new Error("Modulys access denied");


const roomInput = $("#roomInput");
const passwordInput = $("#passwordInput");
const form = $("#roomForm");
const randomBtn = $("#randomRoomBtn");
const status = $("#status");
const moduleAccessReady = Promise.resolve(true);

roomInput.value = randomRoomId();

randomBtn.addEventListener("click", () => {
  roomInput.value = randomRoomId();
  roomInput.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const roomId = normalizeRoomId(roomInput.value);
  const password = passwordInput.value;

  status.textContent = "Création / ouverture de la salle...";
  status.className = "status-text";

  try {
    if (!roomId) throw new Error("Choisis un nom de salle valide.");
    if (!password || password.length < 4) throw new Error("Le mot de passe doit contenir au moins 4 caractères.");

    const hasAccess = await moduleAccessReady;
    if (!hasAccess) throw new Error("Accès Modulys indisponible pour ce module.");

    let usageContext = null;
    const result = await ensureRoom(roomId, password, {
      getCreateMeta: async () => {
        usageContext = await assertCanCreateModuleEvent("improvote");
        return buildModuleEntityMeta(usageContext);
      }
    });
    if (result.created) await recordModuleEventUsage("improvote", roomId, usageContext);

    if (!result.created) {
      const ok = await verifyRoomPassword(roomId, password);
      if (!ok) throw new Error("Cette salle existe déjà, mais le mot de passe est incorrect.");
    }

    rememberPassword(roomId, password);
    window.location.href = publicUrl("settings.html", roomId);
  } catch (error) {
    status.textContent = error.message || "Impossible d'ouvrir la salle.";
    status.className = "status-text error";
  }
});
