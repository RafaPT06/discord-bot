const { SlashCommandBuilder } = require("discord.js");
const { setCardBackground } = require("../services/config");
const { canManageSettings } = require("../utils/perms");

const TYPES = ["level", "profile", "leaderboard", "welcome", "goodbye", "achievement"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_card_background")
    .setDescription("Set a custom background URL for image cards.")
    .addStringOption((o) => o.setName("type").setDescription("Card type").setRequired(true).addChoices(...TYPES.map((t) => ({ name: t, value: t }))))
    .addStringOption((o) => o.setName("url").setDescription("Direct image URL").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });
    const type = interaction.options.getString("type");
    const url = interaction.options.getString("url").trim();
    if (!/^https?:\/\//i.test(url)) return interaction.reply({ content: "Use a valid http/https image URL.", ephemeral: true });
    await setCardBackground(interaction.guildId, type, url, interaction.user.id);
    return interaction.reply({ content: `Background for **${type}** cards updated.`, ephemeral: true });
  },
};
