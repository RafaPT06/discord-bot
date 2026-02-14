const { pool } = require("../db/pool");
const { getRobloxEmbed } = require("./robloxEmbed");

let started = false;
let lastPresenceType = null;

async function getTargets() {
  const { rows } = await pool.query(
    "SELECT guild_id, channel_id FROM roblox_alert_settings WHERE enabled=TRUE"
  );
  return rows || [];
}

async function tick(client) {
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxEmbed(username);

  const type = data.presenceType;
  if (typeof type !== "number") return;

  // baseline: don't send on first tick
  if (lastPresenceType === null) {
    lastPresenceType = type;
    return;
  }

  if (type === lastPresenceType) return;
  lastPresenceType = type;

  const targets = await getTargets();
  if (!targets.length) return;

  for (const t of targets) {
    const ch = await client.channels.fetch(t.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;
    await ch.send({ embeds: [data.embed], components: data.components }).catch(() => {});
  }
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;

  // small delay so everything is ready
  setTimeout(() => {
    // do one baseline tick quickly
    tick(client).catch(() => {});
    setInterval(() => {
      tick(client).catch(() => {});
    }, 120000); // 2 minutes
  }, 10000);
}

module.exports = { startRobloxAlerts };
