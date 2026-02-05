const { SlashCommandBuilder } = require("discord.js");
const { isOwner } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("reset_error_alert_channel").setDescription("Reset error alert channel (Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    if (!isOwner(interaction)) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    await pool.query("DELETE FROM error_alert_settings WHERE guild_id=$1", [interaction.guildId]);
    return interaction.reply({ content: "♻️ Error alert channel reset.", ephemeral: true });
  }
};
