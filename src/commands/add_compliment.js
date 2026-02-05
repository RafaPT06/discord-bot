const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { insertUnique } = require("../utils/dbHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add_compliment")
    .setDescription("Add a compliment (Manage Server / Owner).")
    .addStringOption(o => o.setName("text").setDescription("Compliment text").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "❌ Requires **Manage Server** (or Owner).", ephemeral: true });

    const text = interaction.options.getString("text", true).trim();
    if (!text) return interaction.reply({ content: "❌ Text is empty.", ephemeral: true });

    const id = await insertUnique("compliments", interaction.guildId, text);
    if (!id) return interaction.reply({ content: "⚠️ Already exists.", ephemeral: true });
    return interaction.reply({ content: `✅ Added compliment **#${id}**.` , ephemeral: true });
  },
};
