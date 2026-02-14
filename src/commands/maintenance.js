const { SlashCommandBuilder } = require("discord.js");
const { getMaintenanceEnabled, setMaintenanceEnabled } = require("../services/maintenance");
const { createSection } = require("../utils/layout");

function isOwner(interaction) {
  return interaction.user?.id === process.env.OWNER_ID;
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
          { name: "status", value: "status" },
        ),
    ),
  async execute(interaction) {
    const action = interaction.options.getString("action", true);
    const enabled = await getMaintenanceEnabled();

    if (action === "status") {
      const msg = createSection("Maintenance", [
        { label: "Enabled", value: enabled ? "true" : "false" },
      ]);
      return interaction.reply({ content: msg, ephemeral: false });
    }

    if (!isOwner(interaction)) {
      const msg = createSection("Error", [
        { label: "Reason", value: "Owner only" },
      ]);
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const next = action === "on";
    await setMaintenanceEnabled(next);

    const msg = createSection("Maintenance", [
      { label: "Enabled", value: next ? "true" : "false" },
    ]);
    return interaction.reply({ content: msg, ephemeral: false });
  },
};
