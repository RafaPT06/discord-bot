const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const {
  getUserLevel,
  getUserRank,
  buildLevelEmbed,
  getMemberEmbedColor,
} = require("../services/leveling");
const { createLevelCardBuffer } = require("../utils/levelCard");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your level, rank and XP progress.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: "Server only.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const levelData = await getUserLevel(interaction.guildId, user.id);
    const rank = await getUserRank(interaction.guildId, user.id);
    const progress = levelData.progress || {};

    try {
      const debugData = {
        username: user.username,
        displayName: member?.displayName || user.username,
        discriminator: user.discriminator,
        avatarUrl: user.displayAvatarURL({
          extension: "png",
          size: 256,
          forceStatic: true,
        }),
        rank,
        level: Number(levelData.level || 0),
        currentXp: Number(progress.current || 0),
        neededXp: Number(progress.needed || 0),
        totalXp: Number(levelData.total_xp || 0),
        accentColor: getMemberEmbedColor(member),
      };

      const image = await createLevelCardBuffer(debugData);

      const attachment = new AttachmentBuilder(image, {
        name: "level.png",
      });

      return interaction.reply({
        content:
          "```json\n" +
          JSON.stringify(debugData, null, 2).slice(0, 1800) +
          "\n```",
        files: [attachment],
      });
    } catch (err) {
      return interaction.reply({
        content:
          "❌ Failed to build level card:\n```js\n" +
          String(err?.stack || err?.message || err).slice(0, 1800) +
          "\n```\nFalling back to embed.",
        ephemeral: true,
      });
    }
  },
};