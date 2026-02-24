const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { buildPanelEmbed } = require("../utils/panelPages");

const PAGES = ["overview","channels","diag","feed","perms","sim"];

function row(active) {
  const p = (active || "overview").toLowerCase();
  const mk = (id, label) =>
    new ButtonBuilder()
      .setCustomId(`panel:${id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(id === p);

  return new ActionRowBuilder().addComponents(
    mk("overview","Overview"),
    mk("channels","Channels"),
    mk("diag","Diag"),
    mk("feed","Feed"),
    mk("perms","Perms"),
    mk("sim","Sim")
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Open the bot control panel."),
  async execute(interaction, client) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: false });

    try {
      const embed = await buildPanelEmbed(client, interaction.guildId, "overview");

      // safety: if buildPanelEmbed returns {embed,...} instead of an embed
      const realEmbed = embed?.embed ?? embed;

      return await interaction.editReply({
        embeds: [realEmbed],
        components: [row("overview")],
      });
    } catch (err) {
      console.error("panel error:", err);

      // always respond so it never gets stuck
      return await interaction.editReply({
        content: `Error: ${err?.message || String(err)}`,
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  },
  row,
  PAGES,
};
