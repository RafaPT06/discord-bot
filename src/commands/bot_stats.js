const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { createSection } = require("../utils/layout");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot_stats")
    .setDescription("Show bot usage stats (restricted by permissions)."),
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
      ? topCmds.rows.map((r, i) => `${i + 1}. /${r.command_name} (${r.c})`).join("; ")
      : "n/a";

    const msg = createSection("Bot Stats", [
      { label: "Servers", value: guilds },
      { label: "Uptime", value: `<t:${startedTs}:R>` },
      { label: "Roasts", value: roasts.rows[0].c },
      { label: "Compliments", value: compliments.rows[0].c },
      { label: "Open TODOs", value: todosOpen.rows[0].c },
      { label: "Commands Logged", value: usageTotal.rows[0].c },
      { label: "Top Commands", value: topList },
    ]);

    return interaction.reply({ content: msg, ephemeral: true });
  },
};
