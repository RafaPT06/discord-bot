const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserStats } = require("../services/userStats");
const { getUserLevel, getUserRank } = require("../services/leveling");
const { getUnlockedAchievements, ACHIEVEMENTS, prestigeForLevel } = require("../services/achievements");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show advanced user stats.")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    const user = interaction.options.getUser("user") || interaction.user;
    const stats = await getUserStats(interaction.guildId, user.id);
    const levelData = await getUserLevel(interaction.guildId, user.id);
    const rank = await getUserRank(interaction.guildId, user.id);
    const unlocked = await getUnlockedAchievements(interaction.guildId, user.id);
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
  },
};
