const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");

function pad(lines) {
  // Align labels (monospace-ish inside description; Discord uses proportional but still readable)
  const longest = Math.max(...lines.map(x => x.label.length));
  return lines.map(x => `${x.label.padEnd(longest + 2)}**${x.value}**`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot_stats")
    .setDescription("Show bot usage stats (restricted by permissions)."),
  async execute(interaction, client) {
    // visible to everyone; permission system decides access
    const startedTs = Math.floor((Date.now() - client.uptime) / 1000);

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
      ? topCmds.rows.map((r, i) => `${i + 1}. \`/${r.command_name}\` — **${r.c}**`).join("\n")
      : "No data yet.";

    const lines = pad([
      { label: "Servers", value: String(client.guilds.cache.size) },
      { label: "Uptime", value: `<t:${startedTs}:R>` },
      { label: "Ping", value: `${client.ws.ping}ms` },
      { label: "Node", value: process.version || "unknown" },
      { label: "Environment", value: process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT_NAME || "unknown" },
      { label: "Roasts", value: String(roasts.rows[0].c) },
      { label: "Compliments", value: String(compliments.rows[0].c) },
      { label: "Open TODOs", value: String(todosOpen.rows[0].c) },
      { label: "Commands Logged", value: String(usageTotal.rows[0].c) },
    ]);

    const embed = new EmbedBuilder()
      .setTitle("Bot Stats")
      .setDescription([
        ...lines,
        "",
        "**Top Commands**",
        topList,
      ].join("\n"));

    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
