const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { getUserLevel, getUserRank, buildLevelEmbed, getMemberEmbedColor } = require("../services/leveling");
const { createLevelCardBuffer } = require("../utils/levelCard");

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

    try {
      const progress = levelData.progress;
      const image = await createLevelCardBuffer({
        username: user.username,
        displayName: member?.displayName || user.username,
        discriminator: user.discriminator,
        avatarUrl: user.displayAvatarURL({ extension: "png", size: 256 }),
        rank,
        level: Number(levelData.level || 0),
        currentXp: Number(progress.current || 0),
        neededXp: Number(progress.needed || 0),
        totalXp: Number(levelData.total_xp || 0),
        accentColor: getMemberEmbedColor(member),
      });

      const attachment = new AttachmentBuilder(image, { name: "level.png" });
      return interaction.reply({ files: [attachment] });
    } catch (err) {
      console.error("Failed to build level card:", err);
      const embed = buildLevelEmbed({ user, member, levelData, rank });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
