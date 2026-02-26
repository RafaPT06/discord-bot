const { ActivityType } = require("discord.js");
const { getMaintenanceEnabled } = require("./maintenance");

// 30s rotation as requested
const INTERVAL_MS = 30 * 1000;

let timer = null;
let lastClient = null;
let idx = 0;

function fmtUptime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${ss}s`;
  return `${ss}s`;
}

async function buildLines(client) {
  const servers = client?.guilds?.cache?.size ?? 0;
  const uptime = fmtUptime(process.uptime());
  const maintenance = await getMaintenanceEnabled().catch(() => false);

  return [
    `Uptime: ${uptime}`,
    `Servers: ${servers}`,
    `Maintenance: ${maintenance ? "ON" : "OFF"}`,
  ];
}

async function applyPresence(client, forceLineIndex = null) {
  if (!client?.user) return;

  const maintenance = await getMaintenanceEnabled().catch(() => false);

  const lines = await buildLines(client);
  if (!lines.length) return;

  if (forceLineIndex !== null) {
    idx = Math.max(0, Math.min(lines.length - 1, Number(forceLineIndex) || 0));
  }

  const text = lines[idx % lines.length];

  // Status bubble: keep online normally; show dnd when maintenance ON (clear visual cue)
  const status = maintenance ? "dnd" : "online";

  client.user.setPresence({
    status,
    activities: [{ name: text, type: ActivityType.Watching }],
  });

  idx = (idx + 1) % lines.length;
}

function startPresenceRotation(client) {
  if (timer) return;
  lastClient = client;

  // apply immediately
  applyPresence(client).catch(() => {});

  timer = setInterval(() => {
    applyPresence(client).catch(() => {});
  }, INTERVAL_MS);
}

async function refreshPresenceRotation(client = null) {
  const c = client || lastClient;
  if (!c) return;
  // re-apply without advancing idx (use current idx-1)
  const currentIdx = (idx - 1 + 3) % 3;
  await applyPresence(c, currentIdx);
}

function stopPresenceRotation() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startPresenceRotation, refreshPresenceRotation, stopPresenceRotation };
