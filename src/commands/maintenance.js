const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getMaintenanceEnabled, setMaintenanceEnabled } = require("../services/maintenance");

function isOwner(interaction) {
  return interaction.user?.id === process.env.OWNER_ID;
}

function buildEmbed(enabled) {
  return new EmbedBuilder()
    .setTitle("Maintenance")
    .addFields({ name: "Enabled", value: enabled ? "true" : "false", inline: true })
    .setTimestamp(new Date());
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
      return interaction.reply({ embeds: [buildEmbed(enabled)], ephemeral: false });
    }

    if (!isOwner(interaction)) {
      const e = new EmbedBuilder().setTitle("Error").setDescription("Owner only").setTimestamp(new Date());
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    const next = action === "on";
    await setMaintenanceEnabled(next);
    return interaction.reply({ embeds: [buildEmbed(next)], ephemeral: false });
  },
};
