const { SlashCommandBuilder } = require("discord.js");
const os = require("os");
const { createSection } = require("../utils/layout");
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

    const output = createSection("Bot Status", [
      { label: "Servers", value: client.guilds.cache.size },
      { label: "Uptime", value: formatUptime(uptime) },
      { label: "Ping", value: `${client.ws.ping}ms` },
      { label: "Memory RSS", value: formatBytes(mem.rss) },
      { label: "DB Latency", value: dbLatency },
      { label: "Node", value: node },
      { label: "Environment", value: env },
      { label: "Platform", value: `${os.platform()} ${os.arch()}` },
    ]);

    return interaction.reply({ content: output, ephemeral: false });
  },
};
