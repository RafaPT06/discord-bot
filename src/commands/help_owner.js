const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help_owner")
    .setDescription("Show owner-only commands."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Owner Commands")
      .setDescription(
        [
          "**Owner**",
          "• `/maintenance <on|off|status>` — maintenance mode",
          "• `/deploy_test` — send a test deploy embed (if you still use it)",
"• `/simulate_deploy` — simulate a deploy embed",
"• `/simulate_error` — simulate an error alert",
"• `/simulate_backup` — trigger a backup post",
"• `/simulate_roblox` — simulate a Roblox change",
"• `/simulate_feed` — send a feed test event",
          "Tip: You can also manage permissions with the `/perm_*` commands.",
        ].join("\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
