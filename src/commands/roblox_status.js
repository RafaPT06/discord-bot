const { SlashCommandBuilder } = require("discord.js");
const { getRobloxEmbed } = require("../services/robloxEmbed");

module.exports = {
  data: new SlashCommandBuilder().setName("roblox_status").setDescription("Show Roblox presence (owner only)."),
  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    const username = process.env.ROBLOX_USERNAME || "qxR4F4";
    const data = await getRobloxEmbed(username);
    return interaction.editReply({ embeds: [data.embed], components: data.components });
  },
};
