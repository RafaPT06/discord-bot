const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_roblox_alert_channel")
    .setDescription("Set the channel for Roblox presence alerts (owner only).")
    .addChannelOption(o => o
      .setName("channel")
      .setDescription("Channel to post alerts in")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const ch = interaction.options.getChannel("channel", true);
    await pool.query(
      `INSERT INTO roblox_alert_settings (guild_id, channel_id, enabled, updated_at)
       VALUES ($1,$2,TRUE,NOW())
       ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
      [interaction.guildId, ch.id]
    );
    return interaction.reply({ content: `✅ Roblox alerts will post in ${ch}.`, ephemeral: true });
  },
};
