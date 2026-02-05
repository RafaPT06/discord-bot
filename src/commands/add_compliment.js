const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_compliment")
    .setDescription("Add a compliment")
    .addStringOption(o => o.setName("text").setDescription("Compliment text").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const text = interaction.options.getString("text", true).trim();
    const { rows } = await pool.query(
      `INSERT INTO content_items (guild_id, type, text)
       VALUES ($1,'compliment',$2)
       ON CONFLICT (guild_id, type, text) DO NOTHING
       RETURNING id`,
      [interaction.guildId, text]
    );
    if (!rows.length) return interaction.reply({ content: "⚠️ That compliment already exists.", ephemeral: true });
    return interaction.reply({ content: `✅ Added compliment (id: ${rows[0].id}).`, ephemeral: true });
  },
};
