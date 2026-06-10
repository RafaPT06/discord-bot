const { SlashCommandBuilder } = require("discord.js");
const { getUserLevel, getUserRank, buildLevelEmbed } = require("../services/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your level, rank and XP progress.")
    .addUserOption((o) =>
      o.setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const levelData = await getUserLevel(interaction.guildId, user.id);
    const rank = await getUserRank(interaction.guildId, user.id);
    const embed = buildLevelEmbed({ user, member, levelData, rank });

    return interaction.reply({ embeds: [embed] });
  },
};
