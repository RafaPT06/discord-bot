const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { buildPanelEmbed } = require("../utils/panelPages");

const PAGES = ["overview", "channels", "diag", "feed", "perms", "sim"];

function rows(active) {
  const p = (active || "overview").toLowerCase();

  const mk = (id, label) =>
    new ButtonBuilder()
      .setCustomId(`panel:${id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(id === p);

  // Discord limit: max 5 buttons per row
  const row1 = new ActionRowBuilder().addComponents(
    mk("overview", "Overview"),
    mk("channels", "Channels"),
    mk("diag", "Diag"),
    mk("feed", "Feed"),
    mk("perms", "Perms")
  );

  const row2 = new ActionRowBuilder().addComponents(mk("sim", "Sim"));

  return [row1, row2];
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
        components: rows("overview"),
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
