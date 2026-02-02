module.exports = {
  name: "ping",
  async execute(interaction, ctx) {
    const { client } = ctx;
    return interaction.reply({ content: `📡 **Ping:** ${client.ws.ping}ms`, ephemeral: false });
  },
};
