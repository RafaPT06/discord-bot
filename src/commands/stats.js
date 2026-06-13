const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { getUserStats } = require("../services/userStats");
const { getUserLevel, getUserRank, getMemberEmbedColor } = require("../services/leveling");
const { getUnlockedAchievements, ACHIEVEMENTS, prestigeForLevel } = require("../services/achievements");
const { createStatsCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("../services/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show advanced user stats.")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const stats = await getUserStats(interaction.guildId, user.id);
    const levelData = await getUserLevel(interaction.guildId, user.id);
    const rank = await getUserRank(interaction.guildId, user.id);
    const unlocked = await getUnlockedAchievements(interaction.guildId, user.id);
    const progress = levelData.progress || {};

    try {
      const image = await createStatsCardBuffer({
        username: user.username,
        displayName: member?.displayName || user.username,
        avatarUrl: user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
        rank,
        level: Number(levelData.level || 0),
        prestige: prestigeForLevel(levelData.level || 0),
        currentXp: Number(progress.current || 0),
        neededXp: Number(progress.needed || 0),
        totalXp: Number(levelData.total_xp || 0),
        messages: Number(stats.messages || 0),
        commandsUsed: Number(stats.commands_used || 0),
        levelsGained: Number(stats.levels_gained || 0),
        xpToday: Number(stats.xp_earned_today || 0),
        xpWeek: Number(stats.xp_earned_week || 0),
        achievementsUnlocked: unlocked.size,
        achievementsTotal: ACHIEVEMENTS.length,
        accentColor: getMemberEmbedColor(member),
        backgroundUrl: await getCardBackground(interaction.guildId, "stats").catch(() => null),
      });
      return interaction.reply({ files: [new AttachmentBuilder(image, { name: "stats.png" })] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${user.username}'s Stats`)
        .addFields(
          { name: "Rank", value: `#${rank || "—"}`, inline: true },
          { name: "Level", value: String(levelData.level || 0), inline: true },
          { name: "Prestige", value: String(prestigeForLevel(levelData.level || 0)), inline: true },
          { name: "Messages", value: Number(stats.messages || 0).toLocaleString(), inline: true },
          { name: "Commands", value: Number(stats.commands_used || 0).toLocaleString(), inline: true },
          { name: "Levels gained", value: Number(stats.levels_gained || 0).toLocaleString(), inline: true },
          { name: "XP today", value: Number(stats.xp_earned_today || 0).toLocaleString(), inline: true },
          { name: "XP this week", value: Number(stats.xp_earned_week || 0).toLocaleString(), inline: true },
          { name: "Achievements", value: `${unlocked.size}/${ACHIEVEMENTS.length}`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
