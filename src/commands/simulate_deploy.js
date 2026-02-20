const { SlashCommandBuilder } = require("discord.js");
const { buildDeployEmbed } = require("../services/deployNotifier");
const { sendFeed } = require("../services/feed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_deploy")
    .setDescription("Owner: simulate a deploy notification."),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({ content: "Error: Owner only." }).catch(() => {});
    }
    const embed = buildDeployEmbed ? buildDeployEmbed("deploy") : null;
    if (embed) {
      await interaction.channel.send({ embeds: [embed] }).catch(() => {});
      await sendFeed(client, interaction.guildId, 2, embed);
    }
    return interaction.editReply({ content: "Simulated deploy sent." }).catch(() => {});
  },
};
