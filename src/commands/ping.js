const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Bot latency."),
  async execute(interaction, client) {
    return interaction.reply({ content: `🏓 Pong! **${client.ws.ping}ms**`, ephemeral: false });
  },
};
