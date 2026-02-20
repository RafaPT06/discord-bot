const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { pool } = require("../db/pool");
const { measureDbLatency } = require("../utils/dbHelpers");
const { canManageSettings } = require("../utils/perms");

function ok(v) { return v ? "OK" : "FAIL"; }

async function getOne(sql, params=[]) {
  const res = await pool.query(sql, params);
  return res.rows?.[0] || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("diag")
    .setDescription("Diagnostics: checks bot health + configuration (Manage Server / Owner)."),
  async execute(interaction, client) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: "Requires **Manage Server** (or Owner).", ephemeral: true });
    }

    const embed = new EmbedBuilder().setTitle("Diagnostics");

    // Env checks (only show missing names)
    const required = ["BOT_TOKEN", "OWNER_ID", "DATABASE_URL"];
    const missing = required.filter(k => !process.env[k]);
    embed.addFields({ name: "Env", value: missing.length ? `Missing: ${missing.join(", ")}` : "OK", inline: false });

    // DB check
    let dbOk = false;
    let latency = "n/a";
    try {
      latency = `${await measureDbLatency()}ms`;
      dbOk = true;
    } catch (_) {}
    embed.addFields(
      { name: "Database", value: `${ok(dbOk)} (latency: ${latency})`, inline: false },
    );

    // Commands loaded
    embed.addFields({ name: "Commands Loaded", value: String(client.commands?.size || 0), inline: true });

    // Permission check for bot in this guild
    const me = interaction.guild.members.me;
    if (me) {
      const perms = me.permissions;
      const need = [
        ["View Channels", PermissionsBitField.Flags.ViewChannel],
        ["Send Messages", PermissionsBitField.Flags.SendMessages],
        ["Embed Links", PermissionsBitField.Flags.EmbedLinks],
        ["Manage Channels", PermissionsBitField.Flags.ManageChannels],
      ];
      const missingPerms = need.filter(([_, f]) => !perms.has(f)).map(([n]) => n);
      embed.addFields({
        name: "Bot Permissions",
        value: missingPerms.length ? `Missing: ${missingPerms.join(", ")}` : "OK",
        inline: false,
      });
    } else {
      embed.addFields({ name: "Bot Permissions", value: "n/a", inline: false });
    }

    // Config checks (best-effort, won’t throw if tables differ)
    const checks = [];
    async function checkSetting(label, sql) {
      try {
        const row = await getOne(sql, [interaction.guildId]);
        const chId = row?.channel_id;
        checks.push(`${label}: ${chId ? `set (${chId})` : "not set"}`);
      } catch {
        checks.push(`${label}: n/a`);
      }
    }

    await checkSetting("Deploy channel", "SELECT channel_id FROM deploy_channel_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Roblox alerts", "SELECT channel_id FROM roblox_alert_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Error alerts", "SELECT channel_id FROM error_alert_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Backup channel", "SELECT channel_id FROM backup_channel_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");

    embed.addFields({ name: "Channel Config", value: checks.join("\n"), inline: false });

    return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
  },
};
