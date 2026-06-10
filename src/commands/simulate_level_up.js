const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const {
  getUserLevel,
  getUserRank,
  xpNeededForNextLevel,
  progressForLevel,
  buildLevelUpEmbed,
  getMemberEmbedColor,
} = require("../services/leveling");
const { createLevelCardBuffer } = require("../utils/levelCard");

function totalXpAtStartOfLevel(level) {
  let total = 0;
  for (let l = 0; l < level; l += 1) total += xpNeededForNextLevel(l);
  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_level_up")
    .setDescription("Preview how the level-up message will look without giving XP.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) =>
      o.setName("user")
        .setDescription("User to preview")
        .setRequired(false)
    )
    .addIntegerOption((o) =>
      o.setName("level")
        .setDescription("Level to preview, defaults to user's next level")
        .setMinValue(1)
        .setMaxValue(1000)
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

    const current = await getUserLevel(interaction.guildId, user.id);
    const currentLevel = Number(current.level || 0);
    const previewLevel = interaction.options.getInteger("level") || currentLevel + 1;
    const oldLevel = Math.max(0, previewLevel - 1);

    const needed = xpNeededForNextLevel(previewLevel);
    const totalXp = totalXpAtStartOfLevel(previewLevel) + Math.floor(needed * 0.54);
    const progress = progressForLevel(totalXp, previewLevel);
    const rank = await getUserRank(interaction.guildId, user.id);

    const isPublic = interaction.options.getBoolean("public") || false;

    try {
      const image = await createLevelCardBuffer({
        username: user.username,
        displayName: member.displayName || user.username,
        discriminator: user.discriminator,
        avatarUrl: user.displayAvatarURL({ extension: "png", size: 256 }),
        rank: rank || 1,
        level: previewLevel,
        previousLevel: oldLevel,
        currentXp: progress.current,
        neededXp: progress.needed,
        totalXp,
        accentColor: getMemberEmbedColor(member),
        title: `Level up! ${oldLevel} → ${previewLevel}`,
      });

      const attachment = new AttachmentBuilder(image, { name: "level-up-preview.png" });
      return interaction.reply({
        content: `${member} levelled up to **lvl ${previewLevel}**! *(simulation)*`,
        files: [attachment],
        ephemeral: !isPublic,
      });
    } catch (err) {
      console.error("Failed to build simulated level-up card:", err);
      const rewardRole = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === `level ${previewLevel}`);
      const embed = buildLevelUpEmbed({
        member,
        oldLevel,
        newLevel: previewLevel,
        totalXp,
        addedRoles: rewardRole ? [rewardRole] : [],
        simulated: true,
      });
      return interaction.reply({ embeds: [embed], ephemeral: !isPublic });
    }
  },
};
