const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("show_error_alert_channel").setDescription("Show error alert channel (Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });    const { rows } = await pool.query("SELECT channel_id, enabled FROM error_alert_settings WHERE guild_id=$1", [interaction.guildId]);
    const r = rows[0];
    if (!r) return interaction.reply({ content: "ℹ️ No error alert channel set.", ephemeral: true });
    return interaction.reply({ content: `🚨 Error alerts: <#${r.channel_id}> (${r.enabled ? "enabled" : "disabled"})`, ephemeral: true });
  }
};
