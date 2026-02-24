const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { buildPanelEmbed } = require("../utils/panelPages");

const PAGES = ["overview", "channels", "diag", "feed", "perms", "sim", "logs"];

function selectRow(active) {
  const p = (active || "overview").toLowerCase();
  const options = [
    { label: "Overview", value: "overview" },
    { label: "Channels", value: "channels" },
    { label: "Diagnostics", value: "diag" },
    { label: "Feed", value: "feed" },
    { label: "Permissions", value: "perms" },
    { label: "Simulation", value: "sim" },
    { label: "Logs", value: "logs" },
  ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId("panel_select")
    .setPlaceholder("Select a panel page…")
    .addOptions(options)
    .setMinValues(1)
    .setMaxValues(1);

  // Discord doesn't allow setting selected option directly; we just keep it consistent by updating embed title.
  return new ActionRowBuilder().addComponents(menu);
}

function actionRows() {
  const mk = (id, label, style = ButtonStyle.Secondary) =>
    new ButtonBuilder()
      .setCustomId(`panelact:${id}`)
      .setLabel(label)
      .setStyle(style);

  const row1 = new ActionRowBuilder().addComponents(
    mk("maintenance_toggle", "Toggle Maintenance", ButtonStyle.Danger),
    mk("backup_now", "Backup Now", ButtonStyle.Primary),
    mk("feed_test", "Feed Test", ButtonStyle.Secondary),
    mk("deploy_test", "Deploy Test", ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    mk("setup_wizard", "Setup Channels", ButtonStyle.Primary),
    mk("logs_clear", "Clear Logs", ButtonStyle.Danger)
  );

  return [row1, row2];
}

function buildComponents(page) {
  return [selectRow(page), ...actionRows()];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open the bot control panel."),
  async execute(interaction, client) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    try {
      const built = await buildPanelEmbed(client, interaction.guildId, "overview");
      const embed = built?.embed ?? built;

      return interaction.editReply({
        embeds: [embed],
        components: buildComponents("overview"),
      });
    } catch (err) {
      console.error("panel error:", err);
      return interaction.editReply({
        content: `Error: ${err?.message || String(err)}`,
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  },
  PAGES,
  buildComponents,
};
