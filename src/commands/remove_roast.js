const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { removeById } = require("../utils/dbHelpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove_roast")
    .setDescription("Remove a roast by id (Manage Server / Owner).")
    .addIntegerOption(o => o.setName("id").setDescription("Roast id").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const id = interaction.options.getInteger("id", true);
    const n = await removeById("roasts", interaction.guildId, id);
    if (!n) return interaction.reply({ content: "️ Not found.", ephemeral: true });
    return interaction.reply({ content: `️ Removed roast **#${id}**.`, ephemeral: true });
  },
};
