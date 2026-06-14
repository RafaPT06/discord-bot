const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require("discord.js");
const { createMemberEventCardBuffer } = require("../utils/levelCard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_welcome")
    .setDescription("Preview the welcome image message.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) =>
      o.setName("user")
        .setDescription("User to preview")
        .setRequired(false)
    )
    .addBooleanOption((o) =>
      o.setName("public")
        .setDescription("Send preview publicly instead of only to you")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "Could not fetch that member.", ephemeral: true });

    const image = await createMemberEventCardBuffer({
      type: "welcome",
      username: user.username,
      displayName: member.displayName || user.username,
      avatarUrl: user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
      memberNumber: interaction.guild.memberCount,
      guildName: interaction.guild.name,
      accentColor: member.displayColor || interaction.guild.members.me?.displayColor || 0x7c3aed,
    });

    const attachment = new AttachmentBuilder(image, { name: "welcome-preview.png" });
    return interaction.reply({
      content: `Welcome ${member} to **${interaction.guild.name}**! *(simulation)*`,
      files: [attachment],
      ephemeral: !(interaction.options.getBoolean("public") || false),
    });
  },
};
