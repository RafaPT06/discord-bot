const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("status").setDescription("Uptime + ping + runtime info."),
  async execute(interaction, client) {
    const now = Math.floor(Date.now() / 1000);
    const startedTs = now - Math.floor(client.uptime / 1000);

    const msg = [
      "**Bot Status & Details:**",
      `👑 **Owner:** <@${process.env.OWNER_ID}>`,
      `🤖 **Tag:** ${client.user.tag}`,
      `⏱️ **Uptime:** <t:${startedTs}:R>`,
      `📦 **Node:** ${process.version}`,
      `🧩 **Build:** v${require("../../package.json").version}`,
    ].join("\n");

    return interaction.reply({ content: msg, ephemeral: false });
  },
};
