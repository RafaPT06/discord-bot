const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
  getUserLevel,
  xpNeededForNextLevel,
  buildLevelUpEmbed,
} = require("../services/leveling");

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

    // Put the preview around the middle of the new level, so the progress bar is visible.
    const needed = xpNeededForNextLevel(previewLevel);
    const totalXp = totalXpAtStartOfLevel(previewLevel) + Math.floor(needed * 0.54);

    const rewardRole = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === `level ${previewLevel}`);
    const embed = buildLevelUpEmbed({
      member,
      oldLevel,
      newLevel: previewLevel,
      totalXp,
      addedRoles: rewardRole ? [rewardRole] : [],
      simulated: true,
    });

    const isPublic = interaction.options.getBoolean("public") || false;
    return interaction.reply({ embeds: [embed], ephemeral: !isPublic });
  },
};
