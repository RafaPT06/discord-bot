const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("status").setDescription("Shows bot status."),
  async execute(interaction, client) {
    const started = Math.floor((Date.now() - client.uptime) / 1000);
    const startedAt = Math.floor((Date.now() - client.uptime) / 1000);
    const now = Math.floor(Date.now() / 1000);
    const since = now - startedAt;

    const msg = [
      "**Bot Status & Details:**",
      `🤖 **Tag:** ${client.user.tag}`,
      `📡 **Ping:** ${client.ws.ping}ms`,
      `⏱️ **Uptime:** <t:${now - Math.floor(client.uptime/1000)}:R>`,
      `📦 **Platform:** Node.js ${process.version}`,
      "🛠️ **Built with:** discord.js v14",
    ].join("\n");

    return interaction.reply({ content: msg, ephemeral: false });
  },
};
