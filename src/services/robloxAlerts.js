const { pool } = require("../db/pool");
const { getRobloxBlock } = require("./robloxEmbed");

let started = false;
let lastKey = null;

async function getAlertTargets() {
  // table created in initDb; safe query
  const { rows } = await pool.query(
    "SELECT guild_id, channel_id FROM roblox_alert_settings WHERE enabled=TRUE"
  );
  return rows || [];
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;

  // Delay start so the bot is fully ready
  setTimeout(() => {
    setInterval(async () => {
      try {
        const username = process.env.ROBLOX_USERNAME || "qxR4F4";
        const data = await getRobloxBlock(username);

        // Create a change key that matches meaningful state
        const key = `${data.presenceType}|${data.placeId || ""}|${data.lastLocation || ""}`;

        if (lastKey === null) { lastKey = key; return; }
        if (key === lastKey) return;
        lastKey = key;

        const targets = await getAlertTargets();
        if (!targets.length) return;

        for (const t of targets) {
          const ch = await client.channels.fetch(t.channel_id).catch(() => null);
          if (!ch || !ch.isTextBased()) continue;
          await ch.send({ content: data.text, components: data.components }).catch(() => {});
        }
      } catch (e) {
        console.error("Roblox alert loop error:", e?.message || e);
      }
    }, 60 * 1000); // 1 minute
  }, 10 * 1000);
}

module.exports = { startRobloxAlerts };
