const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("reset_deploy_channel").setDescription("Reset deploy updates channel (Manage Server / Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    await pool.query("DELETE FROM deploy_channel_settings WHERE guild_id=$1", [interaction.guildId]);
    const embed = new EmbedBuilder().setTitle("Deploy Updates").setDescription("Deploy channel reset.");
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
