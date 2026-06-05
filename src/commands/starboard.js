const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getSettings, setSettings, disable } = require('../services/starboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure the starboard system.')
    .addSubcommand(s => s.setName('set').setDescription('Enable or update starboard.')
      .addChannelOption(o => o.setName('channel').setDescription('Starboard channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Reactions needed').setMinValue(1).setMaxValue(50))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to count, default ⭐')))
    .addSubcommand(s => s.setName('status').setDescription('Show starboard settings.'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable starboard.')),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: 'Server only.', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold') || 3;
      const emoji = interaction.options.getString('emoji') || '⭐';
      await setSettings(interaction.guildId, channel.id, threshold, emoji);
      return interaction.reply({ content: `Starboard enabled in ${channel} with threshold ${threshold} using ${emoji}.`, ephemeral: false });
    }
    if (sub === 'disable') {
      await disable(interaction.guildId);
      return interaction.reply({ content: 'Starboard disabled.', ephemeral: false });
    }
    const s = await getSettings(interaction.guildId);
    if (!s) return interaction.reply({ content: 'Starboard is not configured.', ephemeral: false });
    return interaction.reply({ content: `Enabled: ${s.enabled ? 'YES' : 'NO'}\nChannel: <#${s.channel_id}>\nThreshold: ${s.threshold}\nEmoji: ${s.emoji}`, ephemeral: false });
  },
};
