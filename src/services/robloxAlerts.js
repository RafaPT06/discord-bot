const { EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { getRobloxEmbed } = require("./robloxEmbed");

let started = false;
let lastKey = null;

async function getAlertTargets(client) {
  const { rows } = await pool.query(
    "SELECT guild_id, channel_id, enabled FROM roblox_alert_settings WHERE enabled = TRUE"
  );
  return rows;
}

async function startRobloxAlerts(client) {
  if (started) return;
  started = true;

  // wait until ready
  setTimeout(() => {
    setInterval(async () => {
      try {
        const ownerId = process.env.OWNER_ID;
        const username = process.env.ROBLOX_USERNAME || "qxR4F4";
        const embedData = await getRobloxEmbed(username);
        const key = `${embedData.presenceType}|${embedData.placeId || ""}|${embedData.lastLocation || ""}`;

        // prevent first-run spam
        if (lastKey === null) {
          lastKey = key;
          return;
        }
        if (key === lastKey) return;
        lastKey = key;

        const targets = await getAlertTargets(client);
        for (const t of targets) {
          const ch = await client.channels.fetch(t.channel_id).catch(() => null);
          if (!ch || !ch.isTextBased()) continue;

          const mention = ownerId ? `<@${ownerId}> ` : "";
          await ch.send({
            content: mention + "Roblox presence changed:",
            embeds: [embedData.embed],
            components: embedData.components,
          }).catch(() => {});
        }
      } catch (e) {
        // Don't throw; errorAlerts will handle other errors
        console.error("Roblox alert loop error:", e?.message || e);
      }
    }, 2 * 60 * 1000);
  }, 15 * 1000);
}

module.exports = { startRobloxAlerts };
