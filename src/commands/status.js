module.exports = {
  name: "status",
  async execute(interaction) {
    const startedAt = Math.floor((Date.now() - process.uptime() * 1000) / 1000);
    const msg = [
      `⏱️ **Uptime:** <t:${startedAt}:R>`,
      `👨‍💻 **Made by:** Rafa @(atuaprima_)`,
    ].join("\n");

    return interaction.reply({ content: msg, ephemeral: false });
  },
};
