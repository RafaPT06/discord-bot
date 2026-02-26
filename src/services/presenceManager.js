const { ActivityType } = require("discord.js");
const { getMaintenanceEnabled } = require("./maintenance");

let timer = null;
let currentStatus = "online"; // dot status (online/idle/dnd/invisible)
let rotationEnabled = false;
let intervalMs = 30_000;

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function buildActivityText(client) {
  const maintenance = await getMaintenanceEnabled().catch(() => false);

  if (maintenance) {
    // Maintenance ON: show an updating message (activity only)
    return "Updating…";
  }

  // Default: uptime only
  const up = formatUptime(Math.floor(process.uptime()));
  return `Uptime: ${up}`;
}

async function applyPresence(client) {
  if (!client?.user) return;

  const name = await buildActivityText(client);

  // IMPORTANT: maintenance does NOT change dot status — only command does
  try {
  client.user.setPresence({
    status: currentStatus,
    activities: [{ name, type: ActivityType.Watching }],
  });
} catch {}

function startPresenceRotation(client, opts = {}) {
  // rotationEnabled is optional; by default we just refresh every 30s to keep uptime current
  rotationEnabled = Boolean(opts.rotationEnabled ?? false);
  intervalMs = Math.max(10_000, Number(opts.intervalMs || intervalMs));

  if (timer) clearInterval(timer);

  // Always apply once immediately
  applyPresence(client);

  // Keep refreshing so uptime updates on the activity line
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

// Dot status setter (only via command)
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
