const { pool } = require("../db/pool");
const { getRobloxEmbed } = require("./robloxEmbed");

let started = false;
let lastKey = null;

async function getAlertTargets() {
  const { rows } = await pool.query("SELECT guild_id, channel_id FROM roblox_alert_settings WHERE enabled=TRUE");
  return rows;
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;

  setTimeout(() => {
    setInterval(async () => {
      try {
        const username = process.env.ROBLOX_USERNAME || "qxR4F4";
        const data = await getRobloxEmbed(username);
        const key = `${data.presenceType}|${data.placeId || ""}|${data.lastLocation || ""}`;

        if (lastKey === null) { lastKey = key; return; }
        if (key === lastKey) return;
        lastKey = key;

        const targets = await getAlertTargets();
        for (const t of targets) {
          const ch = await client.channels.fetch(t.channel_id).catch(() => null);
          if (!ch || !ch.isTextBased()) continue;
          const mention = process.env.OWNER_ID ? `<@${process.env.OWNER_ID}> ` : "";
          await ch.send({ content: "Roblox presence changed:", embeds: [data.embed], components: data.components }).catch(() => {});
        }
      } catch (e) {
        console.error("Roblox alert loop error:", e?.message || e);
      }
    }, 2 * 60 * 1000);
  }, 10 * 1000);
}

module.exports = { startRobloxAlerts };
