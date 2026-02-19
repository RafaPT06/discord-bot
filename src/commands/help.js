const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show commands you can use."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Commands")
      .setDescription(
        [
          "**Fun / Social**",
          "• `/compliment [user]` — send a random compliment",
          "• `/roast [user]` — roast someone",
          "• `/mimic <text>` — alternating case",
          "• `/cat` — random cat",
          "• `/crazy` — the classic copypasta",
          "",
          "**Status**",
          "• `/status` — bot status and runtime info",
          "• `/ping` — bot latency",
          "",
          "Need admin commands? Use `/help_admin` (Manage Server) or `/help_owner` (Owner).",
        ].join("\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
