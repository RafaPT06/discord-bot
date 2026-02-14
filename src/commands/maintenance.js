const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getMaintenanceEnabled, setMaintenanceEnabled } = require("../services/maintenance");

function isOwner(interaction) {
  return interaction.user?.id === process.env.OWNER_ID;
}

function embedFor(enabled) {
  return new EmbedBuilder()
    .setTitle("Maintenance")
    .addFields({ name: "Enabled", value: String(Boolean(enabled)), inline: false });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("maintenance")
    .setDescription("Toggle maintenance mode (Owner for on/off).")
    .addStringOption((o) =>
      o
        .setName("action")
        .setDescription("on | off | status")
        .setRequired(true)
        .addChoices(
          { name: "on", value: "on" },
          { name: "off", value: "off" },
          { name: "status", value: "status" }
        )
    ),
  async execute(interaction) {
    const action = interaction.options.getString("action", true);

    if (action === "status") {
      const enabled = await getMaintenanceEnabled();
      return interaction.reply({ embeds: [embedFor(enabled)], ephemeral: false });
    }

    if (!isOwner(interaction)) {
      return interaction.reply({ content: "Error: Owner only.", ephemeral: true });
    }

    const next = action === "on";
    await setMaintenanceEnabled(next);
    return interaction.reply({ embeds: [embedFor(next)], ephemeral: false });
  },
};
