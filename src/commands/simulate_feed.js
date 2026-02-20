const { SlashCommandBuilder } = require("discord.js");
const { sendFeed } = require("../services/feed");
const { fieldsEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_feed")
    .setDescription("Owner: simulate a feed event.")
    .addIntegerOption(o =>
      o.setName("level")
        .setDescription("Level")
        .setRequired(true)
        .addChoices(
          { name: "1 (Critical)", value: 1 },
          { name: "2 (System)", value: 2 },
          { name: "3 (Activity)", value: 3 },
        )
    )
    .addStringOption(o =>
      o.setName("title")
        .setDescription("Title")
        .setRequired(false)
    ),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({ content: "Error: Owner only." }).catch(() => {});
    }
    const level = interaction.options.getInteger("level", true);
    const title = interaction.options.getString("title") || "Simulated Feed Event";

    const embed = fieldsEmbed(title, [
      { name: "Level", value: String(level), inline: true },
      { name: "By", value: `<@${interaction.user.id}>`, inline: true },
    ]);

    await sendFeed(client, interaction.guildId, level, embed);
    return interaction.editReply({ content: "Simulated feed event sent." }).catch(() => {});
  },
};
