const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { buildPanelEmbed } = require("../utils/panelPages");

const PAGES = ["overview","channels","feed","perms","sim"];

function row(active) {
  const p = (active || "overview").toLowerCase();
  const mk = (id, label) => new ButtonBuilder().setCustomId(`panel:${id}`).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(id===p);
  return new ActionRowBuilder().addComponents(
    mk("overview","Overview"),
    mk("channels","Channels"),
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
      return interaction.reply({ content: " Server only.", ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    const embed = await buildPanelEmbed(client, interaction.guildId, "overview");
    return interaction.editReply({ embeds: [embed], components: [row("overview")] }).catch(() => {});
  },
  row,
  PAGES,
};
