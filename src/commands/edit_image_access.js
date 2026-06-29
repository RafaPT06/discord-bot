const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  addAllowedUser,
  removeAllowedUser,
  listAllowedUsers,
} = require('../services/editImageAccess');
const { canManageSettings } = require('../utils/perms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit_image_access')
    .setDescription('Manage who can use /edit_image.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName('add')
        .setDescription('Allow a user to use /edit_image')
        .addUserOption((o) => o.setName('user').setDescription('User to allow').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remove')
        .setDescription('Remove a user from /edit_image access')
        .addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('list')
        .setDescription('Show users allowed to use /edit_image')
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Server only.', ephemeral: true });
    }

    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: 'Requires **Manage Server** or bot owner.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user', true);
      await addAllowedUser(interaction.guildId, user.id, interaction.user.id);
      return interaction.reply({
        content: `Allowed ${user} to use \`/edit_image\`.`,
        ephemeral: true,
      });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user', true);
      const removed = await removeAllowedUser(interaction.guildId, user.id);
      return interaction.reply({
        content: removed
          ? `Removed ${user} from \`/edit_image\` access.`
          : `${user} was not in the \`/edit_image\` access list.`,
        ephemeral: true,
      });
    }

    const rows = await listAllowedUsers(interaction.guildId);
    if (!rows.length) {
      return interaction.reply({
        content: 'No users are allowed yet. Add trusted users with `/edit_image_access add` or from the Meowz dashboard.',
        ephemeral: true,
      });
    }

    const lines = rows.slice(0, 25).map((r, i) => `${i + 1}. <@${r.user_id}>`);
    const suffix = rows.length > 25 ? `\n...and ${rows.length - 25} more.` : '';
    return interaction.reply({
      content: `Users allowed to use \`/edit_image\`:\n${lines.join('\n')}${suffix}`,
      ephemeral: true,
    });
  },
};
