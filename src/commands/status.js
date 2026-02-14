const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const os = require("os");
const { measureDbLatency } = require("../utils/dbHelpers");

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Uptime + ping + runtime info."),
  async execute(interaction, client) {
    const uptime = formatUptime(process.uptime());
    const ping = `${client.ws.ping}ms`;
    const mem = formatBytes(process.memoryUsage().rss);

    let dbLatency = "n/a";
    try {
      const ms = await measureDbLatency();
      dbLatency = `${ms}ms`;
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle("Bot Status")
      .addFields(
        { name: "Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "Uptime", value: uptime, inline: true },
        { name: "Ping", value: ping, inline: true },
        { name: "Memory RSS", value: mem, inline: true },
        { name: "DB Latency", value: dbLatency, inline: true },
        { name: "Node", value: process.version, inline: true },
        { name: "Environment", value: process.env.NODE_ENV || "unknown", inline: true },
        { name: "Platform", value: `${os.platform()} ${os.arch()}`, inline: true }
      );

    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
