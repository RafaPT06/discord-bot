const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getModerationSettings } = require('../services/serverSettings');
const { listWarnings, countWarnings } = require('../services/warnings');

function formatDate(value) {
  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(timestamp) ? `<t:${timestamp}:R>` : 'Unknown date';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a member’s moderation warnings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) => option
      .setName('user')
      .setDescription('Member whose warnings should be shown')
      .setRequired(true)),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }
    const settings = await getModerationSettings(interaction.guildId);
    if (!settings.enabled || settings.warnings_enabled === false) {
      return interaction.reply({ content: 'The warning system is disabled in the Meowz dashboard.', ephemeral: true });
    }

    const user = interaction.options.getUser('user', true);
    const [warnings, total] = await Promise.all([
      listWarnings(interaction.guildId, user.id, 10),
      countWarnings(interaction.guildId, user.id),
    ]);

    const description = warnings.length
      ? warnings.map((warning) => `**#${warning.id}** · ${formatDate(warning.created_at)}\n${warning.reason}\nModerator: <@${warning.moderator_id}>`).join('\n\n')
      : 'No warnings are stored for this member.';

    const embed = new EmbedBuilder()
      .setColor(warnings.length ? 0xfee75c : 0x57f287)
      .setTitle(`Warnings · ${user.username}`)
      .setDescription(description.slice(0, 4000))
      .setFooter({ text: `${total} total warning${total === 1 ? '' : 's'} · showing latest ${warnings.length}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
