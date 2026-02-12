const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("todo_list")
    .setDescription("List global TODOs (Manage Server / Owner).")
    .addBooleanOption(o=>o.setName("all").setDescription("Include done items").setRequired(false)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const all = Boolean(interaction.options.getBoolean("all"));
    const q = all
      ? "SELECT id, text, done FROM todos WHERE guild_id=$1 ORDER BY done ASC, id ASC LIMIT 50"
      : "SELECT id, text, done FROM todos WHERE guild_id=$1 AND done=FALSE ORDER BY id ASC LIMIT 50";
    const { rows } = await pool.query(q, [interaction.guildId]);

    const header = all ? "️ **TODOs (all)**" : "️ **TODOs (open)**";
    const body = rows.length
      ? rows.map(r => `${r.done ? "" : ""} **#${r.id}** — ${r.text}`).join("\n")
      : "_No TODOs._";

    return interaction.reply({ content: `${header}\n${body}`, ephemeral: true });
  }
};
