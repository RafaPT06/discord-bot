const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_compliment")
    .setDescription("Remove a compliment by DB id (see list).")
    .addIntegerOption(o => o.setName("id").setDescription("DB id").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const id = interaction.options.getInteger("id", true);
    const { rows } = await pool.query(
      "DELETE FROM content_items WHERE guild_id=$1 AND type='compliment' AND id=$2 RETURNING id",
      [interaction.guildId, id]
    );
    if (!rows.length) return interaction.reply({ content: "⚠️ Not found.", ephemeral: true });
    return interaction.reply({ content: `✅ Removed compliment id ${id}.`, ephemeral: true });
  },
};
