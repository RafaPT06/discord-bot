const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const os = require("os");
const { pool } = require("../db/pool");
const { measureDbLatency } = require("../utils/dbHelpers");
const { canManageSettings } = require("../utils/perms");
const { fieldsEmbed } = require("../utils/embeds");
const { getMaintenanceEnabled } = require("../services/maintenance");
const { getFeedSetting } = require("../services/feed");
const { getBackupSetting } = require("../services/backupScheduler");

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

async function safeOne(sql, params = []) {
  try {
    const res = await pool.query(sql, params);
    return res.rows?.[0] || null;
  } catch {
    return null;
  }
}

async function getChannelSetting(table, guildId) {
  // tables used in this bot store enabled + channel_id; some may not exist depending on version
  const row = await safeOne(
    `SELECT channel_id, enabled FROM ${table} WHERE guild_id=$1 LIMIT 1`,
    [guildId],
  );
  return row || null;
}

function channelLine(label, row) {
  if (!row?.channel_id) return `${label}: not set`;
  const enabled = (row.enabled === undefined) ? "" : ` (enabled: ${row.enabled ? "true" : "false"})`;
  return `${label}: <#${row.channel_id}>${enabled}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sys")
    .setDescription("System panel: health + configuration summary (Manage Server / Owner).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }
    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: "Error: Manage Server / Owner only.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const uptime = Math.floor(process.uptime());
    const mem = process.memoryUsage();
    const node = process.version;
    const env = process.env.NODE_ENV || "unknown";

    let dbLatency = "n/a";
    try {
      const ms = await measureDbLatency();
      dbLatency = `${ms}ms`;
    } catch {}

    const maintenance = await getMaintenanceEnabled().catch(() => false);

    // Channel settings (best-effort)
    const deploy = await getChannelSetting("deploy_channel_settings", interaction.guildId);
    const roblox = await getChannelSetting("roblox_alert_settings", interaction.guildId);
    const errors = await getChannelSetting("error_alert_settings", interaction.guildId);

    // Backup + Feed settings via their services
    const backup = await getBackupSetting(interaction.guildId).catch(() => null);
    const feed = await getFeedSetting(interaction.guildId).catch(() => null);

    // Simple usage stats (best-effort)
    const usage24 = await safeOne(
      `SELECT COUNT(*)::int AS n
       FROM command_usage
       WHERE guild_id=$1 AND created_at >= (NOW() - INTERVAL '24 hours')`,
      [interaction.guildId],
    );
    const errors24 = await safeOne(
      `SELECT COUNT(*)::int AS n
       FROM command_usage
       WHERE guild_id=$1 AND ok=FALSE AND created_at >= (NOW() - INTERVAL '24 hours')`,
      [interaction.guildId],
    );

    const fields = [
      { name: "Runtime", value: [
          `Servers: ${client.guilds.cache.size}`,
          `Uptime: ${formatUptime(uptime)}`,
          `Ping: ${client.ws.ping}ms`,
          `Memory RSS: ${formatBytes(mem.rss)}`,
          `Node: ${node}`,
          `Env: ${env}`,
          `Platform: ${os.platform()} ${os.arch()}`,
        ].join("\n"), inline: false },

      { name: "Database", value: `Latency: ${dbLatency}`, inline: false },

      { name: "Modes", value: `Maintenance: ${maintenance ? "ON" : "OFF"}`, inline: false },

      { name: "Channels", value: [
          channelLine("Deploy", deploy),
          channelLine("Roblox", roblox),
          channelLine("Errors", errors),
          (backup?.channel_id ? `Backups: <#${backup.channel_id}> (enabled: ${backup.enabled ? "true" : "false"})` : "Backups: not set"),
          (feed?.channel_id ? `Feed: <#${feed.channel_id}> (level: ${feed.level || 2}, enabled: ${feed.enabled ? "true" : "false"})` : "Feed: not set"),
        ].join("\n"), inline: false },

      { name: "Activity (24h)", value: [
          `Commands: ${usage24?.n ?? "n/a"}`,
          `Failures: ${errors24?.n ?? "n/a"}`,
        ].join("\n"), inline: false },
    ];

    const embed = fieldsEmbed("System Panel", fields);
    return interaction.editReply({ embeds: [embed] }).catch(() => {});
  },
};
