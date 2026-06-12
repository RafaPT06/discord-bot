const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const {
  getUserLevel,
  getUserRank,
  buildLevelEmbed,
  getMemberEmbedColor,
} = require("../services/leveling");
const { createProfileCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("../services/config");
const { getUserStats } = require("../services/userStats");
const { getUnlockedAchievements, ACHIEVEMENTS, prestigeForLevel } = require("../services/achievements");

async function getCommandCount(guildId, userId) {
  try {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count FROM command_usage WHERE guild_id=$1 AND user_id=$2`,
      [guildId, userId]
    );
    return Number(res.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show a user's profile card.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const levelData = await getUserLevel(interaction.guildId, user.id);
    const rank = await getUserRank(interaction.guildId, user.id);
    const progress = levelData.progress || {};
    const commandCount = await getCommandCount(interaction.guildId, user.id);
    const stats = await getUserStats(interaction.guildId, user.id).catch(() => ({}));
    const unlocked = await getUnlockedAchievements(interaction.guildId, user.id).catch(() => new Map());
    const backgroundUrl = await getCardBackground(interaction.guildId, "profile").catch(() => null);

    try {
      const image = await createProfileCardBuffer({
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
        commandCount: Number(stats.commands_used || commandCount || 0),
        messageCount: Number(stats.messages || 0),
        achievementsUnlocked: unlocked.size || 0,
        achievementsTotal: ACHIEVEMENTS.length,
        prestige: prestigeForLevel(Number(levelData.level || 0)),
        backgroundUrl,
        joinedAt: member?.joinedAt || null,
        createdAt: user.createdAt,
        accentColor: getMemberEmbedColor(member),
      });

      const attachment = new AttachmentBuilder(image, { name: "profile.png" });
      return interaction.reply({ files: [attachment] });
    } catch (err) {
      const embed = buildLevelEmbed({ user, member, levelData, rank });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
