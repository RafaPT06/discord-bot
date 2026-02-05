const { SlashCommandBuilder } = require("discord.js");
const { isOwner } = require("../utils/perms");
const { getRobloxEmbed } = require("../services/robloxEmbed");

module.exports = {
  data: new SlashCommandBuilder().setName("roblox_status").setDescription("Roblox online/in-game status (Owner)."),
  async execute(interaction) {
    if (!isOwner(interaction)) return interaction.reply({ content: "❌ Owner only.", ephemeral: false });
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const username = process.env.ROBLOX_USERNAME || "qxR4F4";
    const data = await getRobloxEmbed(username);
    return interaction.editReply({ embeds: [data.embed], components: data.components });
  }
};
