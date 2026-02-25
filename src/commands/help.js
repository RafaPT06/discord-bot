const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require("discord.js");
const { buildHelpEmbed } = require("../utils/helpPages");

function helpRow(active) {
  const page = (active || "fun").toLowerCase();
  const fun = new ButtonBuilder().setCustomId("help:fun").setLabel("Fun").setStyle(ButtonStyle.Secondary);
  const admin = new ButtonBuilder().setCustomId("help:admin").setLabel("Admin").setStyle(ButtonStyle.Secondary);
  const owner = new ButtonBuilder().setCustomId("help:owner").setLabel("Owner").setStyle(ButtonStyle.Secondary);

  // Disable the active tab button
  if (page === "fun") fun.setDisabled(true);
  if (page === "admin") admin.setDisabled(true);
  if (page === "owner") owner.setDisabled(true);

  return new ActionRowBuilder().addComponents(fun, admin, owner);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show commands you can use.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
  async execute(interaction) {
    const embed = buildHelpEmbed("fun");
    return interaction.reply({ embeds: [embed], components: [helpRow("fun")], ephemeral: false });
  },
  // exported for button handler
  helpRow,
};