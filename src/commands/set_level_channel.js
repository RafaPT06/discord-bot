const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { upsertLevelChannel, ensureLevelRewardRoles } = require("../services/leveling");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_level_channel")
    .setDescription("Set the channel for level-up messages and create level roles.")
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Level-up channel")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    const channel = interaction.options.getChannel("channel", true);
    await interaction.deferReply({ ephemeral: true });
    await upsertLevelChannel(interaction.guildId, channel.id);

    let rolesText = "not created";
    if (interaction.guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      const roles = await ensureLevelRewardRoles(interaction.guild).catch(() => []);
      rolesText = roles.length ? roles.map(({ level }) => `Level ${level}`).join(", ") : "not created";
    }

    return interaction.editReply(`Level-up channel set to ${channel}. Level roles: ${rolesText}`);
  },
};
