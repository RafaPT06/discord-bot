const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_clear")
    .setDescription("Clear custom permissions for a command (Manage Server / Owner).")
    .addStringOption(o => o.setName("command").setDescription("Command name (no slash)").setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const command = interaction.options.getString("command", true).trim().toLowerCase();
    await pool.query("DELETE FROM command_permissions WHERE guild_id=$1 AND command_name=$2", [interaction.guildId, command]);

    return interaction.reply({ content: `️ Cleared custom permissions for \`/${command}\` (back to default).`, ephemeral: true });
  }
};
