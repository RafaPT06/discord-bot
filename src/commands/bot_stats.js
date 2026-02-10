const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bot_stats")
    .setDescription("Show bot usage stats (Owner)."),
  async execute(interaction, client) {
    const guilds = client.guilds.cache.size;
    const now = Math.floor(Date.now() / 1000);
    const startedTs = now - Math.floor(client.uptime / 1000);

    const [roasts, compliments, todosOpen, usageTotal, topCmds] =
      await Promise.all([
        pool.query("SELECT COUNT(*)::int c FROM roasts"),
        pool.query("SELECT COUNT(*)::int c FROM compliments"),
        pool.query("SELECT COUNT(*)::int c FROM todos WHERE done=FALSE"),
        pool.query("SELECT COUNT(*)::int c FROM command_usage"),
        pool.query(`SELECT command_name, COUNT(*)::int c FROM command_usage GROUP BY command_name ORDER BY c DESC LIMIT 5`),
      ]);

    const topList = topCmds.rows.length
      ? topCmds.rows
          .map((r, i) => `${i + 1}. \`/${r.command_name}\` — **${r.c}**`)
          .join("\n")
      : "_No data yet._";

    const msg = [
      "**📈 Bot Stats**",
      `🌐 **Servers:** ${guilds}`,
      `⏱️ **Uptime:** <t:${startedTs}:R>`,
      `📡 **Ping:** ${client.ws.ping}ms`,
      "",
      "**🗃️ Database**",
      `🔥 **Roasts:** ${roasts.rows[0].c}`,
      `💖 **Compliments:** ${compliments.rows[0].c}`,
      `🟨 **Open TODOs:** ${todosOpen.rows[0].c}`,
      "",
      "**⚙️ Usage**",
      `🧾 **Commands logged:** ${usageTotal.rows[0].c}`,
      `🏆 **Top commands:**\n${topList}`,
    ].join("\n");

    return interaction.reply({ content: msg, ephemeral: true });
  },
};
