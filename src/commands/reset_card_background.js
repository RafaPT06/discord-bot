const { SlashCommandBuilder } = require("discord.js");
const { resetCardBackground } = require("../services/config");
const { canManageSettings } = require("../utils/perms");

const TYPES = ["level", "profile", "leaderboard", "welcome", "goodbye", "achievement"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_card_background")
    .setDescription("Reset a custom card background.")
    .addStringOption((o) => o.setName("type").setDescription("Card type").setRequired(true).addChoices(...TYPES.map((t) => ({ name: t, value: t })))),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });
    const type = interaction.options.getString("type");
    await resetCardBackground(interaction.guildId, type);
    return interaction.reply({ content: `Background for **${type}** cards reset.`, ephemeral: true });
  },
};
