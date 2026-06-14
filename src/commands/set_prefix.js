const { SlashCommandBuilder } = require("discord.js");
const { setGuildPrefix } = require("../services/prefixSettings");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_prefix")
    .setDescription("Set the server prefix for supported text commands.")
    .addStringOption((o) =>
      o
        .setName("prefix")
        .setDescription("New prefix, e.g. . or !")
        .setRequired(true)
        .setMaxLength(5)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    const prefix = interaction.options.getString("prefix", true).trim();
    const saved = await setGuildPrefix(interaction.guildId, prefix);
    return interaction.reply({ content: `Prefix set to \`${saved}\`. Example: \`${saved}help\``, ephemeral: false });
  },
};
