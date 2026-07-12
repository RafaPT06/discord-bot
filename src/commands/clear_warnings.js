const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getModerationSettings } = require('../services/serverSettings');
const { clearWarnings } = require('../services/warnings');
const { sendLog, sendModerationLog } = require('../services/dashboardEvents');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_warnings')
    .setDescription('Remove all stored warnings from a member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) => option
      .setName('user')
      .setDescription('Member whose warnings should be cleared')
      .setRequired(true)),

  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }
    const settings = await getModerationSettings(interaction.guildId);
    if (!settings.enabled || settings.warnings_enabled === false) {
      return interaction.reply({ content: 'The warning system is disabled in the Meowz dashboard.', ephemeral: true });
    }

    const user = interaction.options.getUser('user', true);
    const removed = await clearWarnings(interaction.guildId, user.id);
    if (!removed) {
      return interaction.reply({ content: `${user} has no stored warnings.`, ephemeral: true });
    }

    const fields = [
      { name: 'User', value: `${user.tag || user.username} (${user.id})`, inline: false },
      { name: 'Moderator', value: `${interaction.user.tag || interaction.user.username} (${interaction.user.id})`, inline: false },
      { name: 'Warnings removed', value: String(removed), inline: true },
    ];
    await Promise.allSettled([
      sendModerationLog(interaction.guild, 'Warnings cleared', fields, 0x57f287),
      sendLog(interaction.guild, 'moderation', 'Warnings cleared', fields, 0x57f287),
    ]);

    return interaction.reply({ content: `Removed **${removed}** warning${removed === 1 ? '' : 's'} from ${user}.`, ephemeral: true });
  },
};
