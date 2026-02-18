const { pool } = require("../db/pool");
const { getRobloxEmbed } = require("./robloxEmbed");

let started = false;
let lastPresenceType = null;

function normalizeComponents(components) {
  if (!components) return [];
  return components.map(c => (typeof c?.toJSON === "function" ? c.toJSON() : c));
}

async function getTargets() {
  const { rows } = await pool.query(
    "SELECT guild_id, channel_id FROM roblox_alert_settings WHERE enabled=TRUE"
  );
  return rows || [];
}

async function tick(client) {
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxEmbed(username);

  const type = data.presenceType ?? null;
  if (type === null) return;

  if (lastPresenceType === null) {
    lastPresenceType = type; // baseline
    return;
  }

  if (type === lastPresenceType) return;
  lastPresenceType = type;

  const targets = await getTargets();
  if (!targets.length) return;

  for (const t of targets) {
    const ch = await client.channels.fetch(t.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;
    await ch.send({
      embeds: [data.embed],
      components: normalizeComponents(data.components),
    }).catch(() => {});
  }
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;
  // Roblox presence has no push/webhook. We poll, but ONLY send when presence changes.
  // Default: 5 minutes (override with ROBLOX_POLL_MS).
  const pollMs = Math.max(30_000, Number(process.env.ROBLOX_POLL_MS || 300_000));
  setInterval(() => {
    tick(client).catch(() => {});
  }, pollMs);
}

module.exports = { startRobloxAlerts };
