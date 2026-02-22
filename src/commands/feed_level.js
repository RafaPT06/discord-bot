const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setFeedLevel, getFeedSetting } = require("../services/feed");
const { successEmbed, infoEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feed_level")
    .setDescription("Set feed verbosity level (1=Critical, 2=System, 3=Activity).")
    .addIntegerOption(o =>
      o.setName("level")
        .setDescription("1, 2, or 3")
        .setRequired(true)
        .addChoices(
          { name: "1 (Critical)", value: 1 },
          { name: "2 (System)", value: 2 },
          { name: "3 (Activity)", value: 3 },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const s = await getFeedSetting(interaction.guildId);
    if (!s) {
      const embed = infoEmbed("Feed Level", "No feed channel set. Use `/set_feed_channel` first.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const level = interaction.options.getInteger("level", true);
    await setFeedLevel(interaction.guildId, level);
    const embed = successEmbed("Feed Level", `Feed level set to **${level}**.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
