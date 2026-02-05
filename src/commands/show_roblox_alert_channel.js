const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder().setName("show_roblox_alert_channel").setDescription("Show Roblox alert channel (owner only)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const { rows } = await pool.query("SELECT channel_id, enabled FROM roblox_alert_settings WHERE guild_id=$1", [interaction.guildId]);
    if (!rows.length) return interaction.reply({ content: "ℹ️ Roblox alerts are not configured.", ephemeral: true });
    const chId = rows[0].channel_id;
    return interaction.reply({ content: `ℹ️ Roblox alerts: ${rows[0].enabled ? "enabled" : "disabled"} in <#${chId}>`, ephemeral: true });
  },
};
