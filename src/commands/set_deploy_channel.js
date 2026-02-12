const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_deploy_channel")
    .setDescription("Set deploy updates channel (Manage Server / Owner).")
    .addChannelOption(o => o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const ch = interaction.options.getChannel("channel", true);
    await pool.query(
      `INSERT INTO deploy_channel_settings (guild_id, channel_id) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
      [interaction.guildId, ch.id]
    );
    return interaction.reply({ content: ` Deploy updates will post in ${ch}.`, ephemeral: true });
  }
};
