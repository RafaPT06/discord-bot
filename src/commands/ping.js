const { SlashCommandBuilder, InteractionContextType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Bot latency.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
  async execute(interaction, client) {
    return interaction.reply({ content: `Pong. \`${client.ws.ping}ms\``, ephemeral: false });
  },
};
