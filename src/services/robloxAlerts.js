const { pool } = require("../db/pool");
const { getRobloxBlock } = require("./robloxEmbed");

let started = false;
let lastKey = null;

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roblox_alert_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAlertTargets() {
  await ensureTable();
  const { rows } = await pool.query("SELECT guild_id, channel_id FROM roblox_alert_settings WHERE enabled=TRUE");
  return rows || [];
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;

  // small delay after startup
  setTimeout(() => {
    setInterval(async () => {
      try {
        const username = process.env.ROBLOX_USERNAME || "qxR4F4";
        const data = await getRobloxBlock(username);
        const key = `${data.presenceType}|${data.placeId || ""}|${data.lastLocation || ""}`;

        if (lastKey === null) { lastKey = key; return; }
        if (key === lastKey) return;
        lastKey = key;

        const targets = await getAlertTargets();
        if (!targets.length) return;

        for (const t of targets) {
          const ch = await client.channels.fetch(t.channel_id).catch(() => null);
          if (!ch || !ch.isTextBased()) continue;
          await ch.send({ content: "Roblox presence changed:", components: data.components, allowedMentions: { parse: [] } }).catch(() => {});
          await ch.send({ content: data.text, components: data.components, allowedMentions: { parse: [] } }).catch(() => {});
        }
      } catch (e) {
        console.error("Roblox alert loop error:", e?.message || e);
      }
    }, 60 * 1000); // 1 minute
  }, 10 * 1000);
}

module.exports = { startRobloxAlerts };
