const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("todo_done")
    .setDescription("Mark a TODO done (Manage Server / Owner).")
    .addIntegerOption(o=>o.setName("id").setDescription("TODO id").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "❌ Requires **Manage Server** (or Owner).", ephemeral: true });

    const id = interaction.options.getInteger("id", true);
    const { rowCount } = await pool.query(
      "UPDATE todos SET done=TRUE, done_at=NOW() WHERE guild_id=$1 AND id=$2 AND done=FALSE",
      [interaction.guildId, id]
    );
    if (!rowCount) return interaction.reply({ content: "⚠️ Not found (or already done).", ephemeral: true });
    return interaction.reply({ content: `✅ Marked TODO **#${id}** done.`, ephemeral: true });
  }
};
