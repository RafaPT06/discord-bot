const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { canManageSettings } = require('../utils/perms');
const {
  enablePersistentVoice,
  getPersistentVoiceSetting,
  leavePersistentVoice,
} = require('../services/persistentVoice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Manage Meowz persistent voice connection.')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('Join your current voice channel and reconnect after restarts.'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('leave')
        .setDescription('Leave voice and disable automatic reconnect.'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Show the persistent voice configuration.')),

  async execute(interaction, client) {
    if (!interaction.guildId || !interaction.guild) {
      return interaction.reply({ content: 'Server only.', ephemeral: true });
    }
    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: 'Requires Manage Server or Owner.', ephemeral: true });
    }

    const action = interaction.options.getSubcommand();

    if (action === 'join') {
      const channel = interaction.member?.voice?.channel;
      if (!channel) {
        return interaction.reply({ content: 'Join a voice channel first, then run `/voice join`.', ephemeral: true });
      }

      const me = interaction.guild.members.me;
      const permissions = channel.permissionsFor(me);
      if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.Connect)) {
        return interaction.reply({ content: `I cannot join ${channel}. Give Meowz View Channel and Connect permissions first.`, ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const { channel: connectedChannel } = await enablePersistentVoice(
        client,
        interaction.guildId,
        channel.id,
        interaction.user.id
      );
      return interaction.editReply(`Joined **${connectedChannel.name}**. I'll automatically reconnect here after restarts or temporary disconnects.`);
    }

    if (action === 'leave') {
      await interaction.deferReply({ ephemeral: true });
      await leavePersistentVoice(interaction.guildId, interaction.user.id);
      return interaction.editReply('Left voice and disabled automatic reconnect for this server.');
    }

    const setting = await getPersistentVoiceSetting(interaction.guildId);
    if (!setting?.enabled) {
      return interaction.reply({ content: 'Persistent voice is currently disabled.', ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(setting.channel_id)
      || await interaction.guild.channels.fetch(setting.channel_id).catch(() => null);
    const label = channel ? `${channel}` : `deleted/unavailable channel (${setting.channel_id})`;
    return interaction.reply({
      content: `Persistent voice is **enabled**. Configured channel: ${label}.`,
      ephemeral: true,
    });
  },
};
