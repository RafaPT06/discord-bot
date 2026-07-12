const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getModerationSettings } = require('../services/serverSettings');
const { addWarning, countWarnings } = require('../services/warnings');
const { sendLog, sendModerationLog } = require('../services/dashboardEvents');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Add a warning to a server member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) => option
      .setName('user')
      .setDescription('Member to warn')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('reason')
      .setDescription('Reason for the warning')
      .setMaxLength(500)
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
    const reason = interaction.options.getString('reason', true).trim();
    if (user.bot) return interaction.reply({ content: 'Bots cannot receive moderation warnings.', ephemeral: true });
    if (user.id === interaction.user.id) return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });

    const warning = await addWarning(interaction.guildId, user.id, interaction.user.id, reason);
    const total = await countWarnings(interaction.guildId, user.id);

    const fields = [
      { name: 'User', value: `${user.tag || user.username} (${user.id})`, inline: false },
      { name: 'Moderator', value: `${interaction.user.tag || interaction.user.username} (${interaction.user.id})`, inline: false },
      { name: 'Reason', value: warning.reason, inline: false },
      { name: 'Warning ID', value: String(warning.id), inline: true },
      { name: 'Total warnings', value: String(total), inline: true },
    ];
    await Promise.allSettled([
      sendModerationLog(interaction.guild, 'Member warned', fields, 0xfee75c),
      sendLog(interaction.guild, 'moderation', 'Member warned', fields, 0xfee75c),
    ]);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('Warning added')
      .setDescription(`${user} has been warned.`)
      .addFields(
        { name: 'Reason', value: warning.reason },
        { name: 'Warning ID', value: String(warning.id), inline: true },
        { name: 'Total warnings', value: String(total), inline: true },
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
