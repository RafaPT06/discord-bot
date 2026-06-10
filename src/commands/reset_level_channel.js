const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { ensureLevelTables } = require("../services/leveling");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_level_channel")
    .setDescription("Disable level-up channel announcements."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });
    await ensureLevelTables();
    await pool.query(`UPDATE level_settings SET channel_id=NULL, enabled=FALSE, updated_at=NOW() WHERE guild_id=$1`, [interaction.guildId]);
    return interaction.reply({ content: "Level-up announcements disabled. XP tracking stays enabled.", ephemeral: true });
  },
};
