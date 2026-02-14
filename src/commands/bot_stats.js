const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

function padRight(str, len) {
  return str + " ".repeat(Math.max(0, len - str.length));
}

function block(title, rows) {
  const longest = Math.max(...rows.map(r => r.label.length));
  const lines = rows.map(r => `${padRight(r.label, longest + 2)}**${r.value}**`);
  return [title, "", ...lines].join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot_stats")
    .setDescription("Show bot usage stats."),
  async execute(interaction, client) {
    const guilds = client.guilds.cache.size;
    const now = Math.floor(Date.now() / 1000);
    const startedTs = now - Math.floor(client.uptime / 1000);

    const [roasts, compliments, todosOpen, usageTotal, topCmds] = await Promise.all([
      pool.query("SELECT COUNT(*)::int c FROM roasts"),
      pool.query("SELECT COUNT(*)::int c FROM compliments"),
      pool.query("SELECT COUNT(*)::int c FROM todos WHERE done=FALSE"),
      pool.query("SELECT COUNT(*)::int c FROM command_usage"),
      pool.query(`
        SELECT command_name, COUNT(*)::int c
        FROM command_usage
        GROUP BY command_name
        ORDER BY c DESC
        LIMIT 5
      `),
    ]);

    const topList = topCmds.rows.length
      ? topCmds.rows.map((r, i) => `${i + 1}. /${r.command_name} (${r.c})`).join(" | ")
      : "No data";

    const text = block("Bot Stats", [
      { label: "Servers", value: String(guilds) },
      { label: "Uptime", value: `<t:${startedTs}:R>` },
      { label: "Ping", value: `${client.ws.ping}ms` },
      { label: "Roasts", value: String(roasts.rows[0].c) },
      { label: "Compliments", value: String(compliments.rows[0].c) },
      { label: "Open TODOs", value: String(todosOpen.rows[0].c) },
      { label: "Commands Logged", value: String(usageTotal.rows[0].c) },
      { label: "Top Commands", value: topList },
    ]);

    return interaction.reply({ content: text, ephemeral: false });
  },
};
