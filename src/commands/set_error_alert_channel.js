const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_error_alert_channel")
    .setDescription("Set the channel for error alerts (owner only).")
    .addChannelOption(o => o
      .setName("channel")
      .setDescription("Channel to post error alerts in")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const ch = interaction.options.getChannel("channel", true);
    await pool.query(
      `INSERT INTO error_alert_settings (guild_id, channel_id, enabled, mention_owner, min_interval_seconds, updated_at)
       VALUES ($1,$2,TRUE,TRUE,120,NOW())
       ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
      [interaction.guildId, ch.id]
    );
    return interaction.reply({ content: `✅ Error alerts will post in ${ch}.`, ephemeral: true });
  },
};
