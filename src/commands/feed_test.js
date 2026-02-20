const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { sendFeed } = require("../services/feed");
const { fieldsEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feed_test")
    .setDescription("Send a test message to the feed channel.")
    .addIntegerOption(o =>
      o.setName("level")
        .setDescription("Test level")
        .setRequired(false)
        .addChoices(
          { name: "1 (Critical)", value: 1 },
          { name: "2 (System)", value: 2 },
          { name: "3 (Activity)", value: 3 },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    const level = interaction.options.getInteger("level") || 2;

    const embed = fieldsEmbed("Feed Test", [
      { name: "Level", value: String(level), inline: true },
      { name: "By", value: `<@${interaction.user.id}>`, inline: true },
    ], "This is a test feed message.");

    await sendFeed(client, interaction.guildId, level, embed);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
