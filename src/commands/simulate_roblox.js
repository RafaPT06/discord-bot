const { SlashCommandBuilder } = require("discord.js");
const { fieldsEmbed } = require("../utils/embeds");
const { sendFeed } = require("../services/feed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_roblox")
    .setDescription("Owner: simulate a Roblox status change alert.")
    .addStringOption(o =>
      o.setName("status")
        .setDescription("Status")
        .setRequired(true)
        .addChoices(
          { name: "offline", value: "offline" },
          { name: "online", value: "online" },
          { name: "ingame", value: "ingame" },
          { name: "studio", value: "studio" },
        )
    ),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({ content: "Error: Owner only." }).catch(() => {});
    }
    const status = interaction.options.getString("status", true);

    const embed = fieldsEmbed("Roblox Status (Simulated)", [
      { name: "Status", value: status, inline: true },
      { name: "By", value: `<@${interaction.user.id}>`, inline: true },
    ]);

    await interaction.channel.send({ embeds: [embed] }).catch(() => {});
    await sendFeed(client, interaction.guildId, 3, embed);

    return interaction.editReply({ content: "Simulated Roblox alert sent." }).catch(() => {});
  },
};
