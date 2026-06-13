const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { ACHIEVEMENTS, getUnlockedAchievements } = require("../services/achievements");
const { createAchievementsListCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("../services/config");
const { getMemberEmbedColor } = require("../services/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("Show a user's unlocked achievements.")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false)),

  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const unlocked = await getUnlockedAchievements(interaction.guildId, user.id);
    const unlockedList = ACHIEVEMENTS.filter((a) => unlocked.has(a.id));

    try {
      const image = await createAchievementsListCardBuffer({
        username: user.username,
        displayName: member?.displayName || user.username,
        avatarUrl: user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
        achievements: unlockedList,
        accentColor: getMemberEmbedColor(member) || 0xfbbf24,
        backgroundUrl: await getCardBackground(interaction.guildId, "achievements").catch(() => null),
      });

      return interaction.reply({ files: [new AttachmentBuilder(image, { name: "achievements.png" })] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle(`${user.username}'s Unlocked Achievements`)
        .setDescription(unlockedList.length ? unlockedList.map((a) => `**${a.name}** — ${a.description}`).join("\n") : "No achievements unlocked yet.")
        .setFooter({ text: `${unlockedList.length}/${ACHIEVEMENTS.length} unlocked` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
