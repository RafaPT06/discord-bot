const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("show_roblox_alert_channel").setDescription("Show Roblox alert channel (Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    const { rows } = await pool.query(
      "SELECT channel_id, enabled FROM roblox_alert_settings WHERE guild_id=$1",
      [interaction.guildId]
    );
    const r = rows[0];
    const embed = new EmbedBuilder().setTitle("Roblox Alerts");

    if (!r) {
      embed.setDescription("No Roblox alert channel set.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    embed.setDescription(`Channel: <#${r.channel_id}>\nEnabled: **${r.enabled ? "true" : "false"}**`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
