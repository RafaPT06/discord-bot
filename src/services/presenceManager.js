const { ActivityType } = require("discord.js");
const { getMaintenanceEnabled } = require("./maintenance");

let timer = null;
let currentStatus = "online"; // dot status (online/idle/dnd/invisible)
let rotationEnabled = false;
let intervalMs = 30_000;

async function buildActivity() {
  const maintenance = await getMaintenanceEnabled().catch(() => false);

  if (maintenance) {
    return {
      name: "Updating…",
      type: ActivityType.Watching,
    };
  }

  return {
    name: "Custom Status",
    type: ActivityType.Custom,
    state: "Casey is gay!!",
  };
}

async function applyPresence(client) {
  if (!client?.user) return;

  const activity = await buildActivity();

  // Maintenance changes only the activity; the configured dot status is preserved.
  try {
    client.user.setPresence({
      status: currentStatus,
      activities: [activity],
    });
  } catch (error) {
    console.error("Failed to update bot presence:", error);
  }
}

function startPresenceRotation(client, opts = {}) {
  rotationEnabled = Boolean(opts.rotationEnabled ?? false);
  intervalMs = Math.max(10_000, Number(opts.intervalMs || intervalMs));

  if (timer) clearInterval(timer);

  applyPresence(client);
  timer = setInterval(() => {
    applyPresence(client);
  }, intervalMs);
}

function stopPresenceRotation() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function refreshPresenceRotation(client) {
  await applyPresence(client);
}

async function setDotStatus(client, status) {
  const allowed = new Set(["online", "idle", "dnd", "invisible"]);
  if (!allowed.has(status)) throw new Error("Invalid status. Use: online, idle, dnd, invisible");

  currentStatus = status;
  await applyPresence(client);
  return currentStatus;
}

function getPresenceState() {
  return {
    status: currentStatus,
    intervalMs,
    rotationEnabled,
    running: Boolean(timer),
  };
}

module.exports = {
  startPresenceRotation,
  stopPresenceRotation,
  refreshPresenceRotation,
  setDotStatus,
  getPresenceState,
};
