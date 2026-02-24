const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { buildPanelEmbed } = require("../utils/panelPages");

const PAGES = ["overview", "channels", "diag", "feed", "perms", "sim", "logs"];

function rows(active) {
  const p = (active || "overview").toLowerCase();

  const mk = (id, label) =>
    new ButtonBuilder()
      .setCustomId(`panel:${id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(id === p);

  const row1 = new ActionRowBuilder().addComponents(
    mk("overview", "Overview"),
    mk("channels", "Channels"),
    mk("diag", "Diag"),
    mk("feed", "Feed"),
    mk("perms", "Perms")
  );

  const row2 = new ActionRowBuilder().addComponents(
    mk("sim", "Sim"),
    mk("logs", "Logs")
  );

  return [row1, row2];
}

function actionRows(page) {
  // Only show quick actions on Overview and Logs pages
  const p = (page || "overview").toLowerCase();
  const show = (p === "overview" || p === "logs");
  if (!show) return [];

  const mk = (id, label, style = ButtonStyle.Primary) =>
    new ButtonBuilder()
      .setCustomId(`panelact:${id}`)
      .setLabel(label)
      .setStyle(style);

  // One row max 5 buttons
  const row = new ActionRowBuilder().addComponents(
    mk("maintenance_toggle", "Toggle Maintenance", ButtonStyle.Danger),
    mk("backup_now", "Backup Now", ButtonStyle.Primary),
    mk("feed_test", "Feed Test", ButtonStyle.Secondary),
    mk("deploy_test", "Deploy Test", ButtonStyle.Secondary),
    mk("logs_clear", "Clear Logs", ButtonStyle.Danger),
  );

  return [row];
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

      // supports either embed directly OR { embed, components }
      const embed = built?.embed ?? built;

      return interaction.editReply({
        embeds: [embed],
        components: [...rows("overview"), ...actionRows("overview")],
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

  rows,
  PAGES,
};
