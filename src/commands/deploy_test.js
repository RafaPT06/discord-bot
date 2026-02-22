const { SlashCommandBuilder } = require("discord.js");
const { buildDeployEmbed } = require("../services/deployNotifier");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deploy_test")
    .setDescription("Send a test deploy notification (restricted)."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    try {
      const embed = buildDeployEmbed("deploy");
      await interaction.channel.send({ embeds: [embed] }).catch(() => {});
      return interaction.editReply({ content: "Deploy test message sent." }).catch(() => {});
    } catch (e) {
      return interaction.editReply({ content: `Error: ${String(e?.message || e).slice(0, 180)}` }).catch(() => {});
    }
  },
};
