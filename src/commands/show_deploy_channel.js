const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("show_deploy_channel").setDescription("Show current deploy updates channel (Manage Server / Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const { rows } = await pool.query("SELECT channel_id, enabled FROM deploy_channel_settings WHERE guild_id=$1", [interaction.guildId]);
    const r = rows[0];
    if (!r) return interaction.reply({ content: "ℹ️ No deploy channel set.", ephemeral: true });
    return interaction.reply({ content: ` Deploy channel: <#${r.channel_id}> (${r.enabled ? "enabled" : "disabled"})`, ephemeral: true });
  }
};
