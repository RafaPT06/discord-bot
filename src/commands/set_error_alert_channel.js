const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { isOwner } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_error_alert_channel")
    .setDescription("Set error alert channel (Owner).")
    .addChannelOption(o => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    if (!isOwner(interaction)) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const ch = interaction.options.getChannel("channel", true);
    await pool.query(
      `INSERT INTO error_alert_settings (guild_id, channel_id) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
      [interaction.guildId, ch.id]
    );
    return interaction.reply({ content: `🚨 Error alerts will post in ${ch}.`, ephemeral: true });
  }
};
