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
    .setDescription("Show bot status and runtime info."),
  async execute(interaction, client) {
    const uptime = Math.floor(process.uptime());
    const mem = process.memoryUsage();
    const node = process.version;
    const env = process.env.NODE_ENV || "unknown";

    let dbLatency = "n/a";
    try {
      const ms = await measureDbLatency();
      dbLatency = `${ms}ms`;
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setTitle("Bot Status")
      .addFields(
        { name: "Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "Uptime", value: formatUptime(uptime), inline: true },
        { name: "Ping", value: `${client.ws.ping}ms`, inline: true },

        { name: "Memory RSS", value: formatBytes(mem.rss), inline: true },
        { name: "DB Latency", value: dbLatency, inline: true },
        { name: "Node", value: node, inline: true },

        { name: "Environment", value: env, inline: true },
        { name: "Platform", value: `${os.platform()} ${os.arch()}`, inline: true }
      )
      .setTimestamp(new Date());

    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
