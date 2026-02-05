const { EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");

const recent = new Map(); // key -> lastSentMs
let globalLastSent = 0;

function redact(s) {
  if (!s) return s;
  const secrets = [
    process.env.BOT_TOKEN,
    process.env.DATABASE_URL,
  ].filter(Boolean);
  let out = String(s);
  for (const sec of secrets) {
    if (sec && sec.length >= 8) out = out.split(sec).join("[REDACTED]");
  }
  return out;
}

async function getTargets() {
  const { rows } = await pool.query(
    "SELECT guild_id, channel_id, enabled, mention_owner, min_interval_seconds FROM error_alert_settings WHERE enabled = TRUE"
  );
  return rows;
}

async function sendAlert(client, title, description, stack) {
  const now = Date.now();
  const key = `${title}|${description}|${stack?.slice(0,200) || ""}`.slice(0, 512);

  // simple global cooldown to avoid storms
  if (now - globalLastSent < 3000) return;
  globalLastSent = now;

  const targets = await getTargets();
  if (!targets.length) return;

  const stackText = stack ? redact(stack).slice(0, 1700) : null;

  for (const t of targets) {
    const last = recent.get(`${t.guild_id}:${key}`) || 0;
    const minMs = (t.min_interval_seconds || 120) * 1000;
    if (now - last < minMs) continue;
    recent.set(`${t.guild_id}:${key}`, now);

    const ch = await client.channels.fetch(t.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;

    const embed = new EmbedBuilder()
      .setTitle(`🚨 ${title}`)
      .setDescription(redact(description).slice(0, 2000))
      .setTimestamp(new Date());

    if (stackText) embed.addFields({ name: "Stack", value: "```\n" + stackText + "\n```" });

    const mention = (t.mention_owner && process.env.OWNER_ID) ? `<@${process.env.OWNER_ID}> ` : "";
    await ch.send({ content: mention + "Bot error captured:", embeds: [embed] }).catch(() => {});
  }
}

function attachErrorAlerts(client) {
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : null;
    sendAlert(client, "Unhandled Rejection", msg, stack).catch(() => {});
  });

  process.on("uncaughtException", (err) => {
    sendAlert(client, "Uncaught Exception", err?.message || "Unknown", err?.stack || null).catch(() => {});
  });

  client.on("error", (err) => {
    sendAlert(client, "Discord Client Error", err?.message || "Unknown", err?.stack || null).catch(() => {});
  });

  client.on("warn", (info) => {
    // optional: comment out if too noisy
    // sendAlert(client, "Discord Warning", String(info), null).catch(() => {});
  });
}

module.exports = { attachErrorAlerts };
