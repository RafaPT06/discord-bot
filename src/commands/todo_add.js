const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("todo_add")
    .setDescription("Add a TODO (Manage Server / Owner).")
    .addStringOption(o=>o.setName("text").setDescription("TODO text").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "❌ Requires **Manage Server** (or Owner).", ephemeral: true });

    const text = interaction.options.getString("text", true).trim();
    const { rows } = await pool.query(
      "INSERT INTO todos (guild_id, text) VALUES ($1, $2) RETURNING id",
      [interaction.guildId, text]
    );
    return interaction.reply({ content: `✅ Added TODO **#${rows[0].id}**.`, ephemeral: true });
  }
};
