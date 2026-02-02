const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  /** @param {import('discord.js').ChatInputCommandInteraction} interaction */
  async execute(interaction, ctx) {
    const { config } = ctx;
    const isGuild = interaction.inGuild();
    const ownerOnly = config.OWNER_ID && interaction.user.id === config.OWNER_ID;
    const ownerDisplay = config.OWNER_ID ? `Rafa (<@${config.OWNER_ID}>)` : "Rafa @(atuaprima_)";

    const embed = new EmbedBuilder()
      .setTitle("🤖 Bot Commands")
      .setDescription("Here’s everything you can use:")
      .addFields(
        {
          name: "✨ Fun / Social",
          value: [
            "• `/compliment [user]` — send a random compliment",
            "• `/roast [user]` — roast someone 🔥",
            "• `/mimic <text>` — SpOnGeBoB cAsE",
            "• `/cat` — random chaotic cat 🐱",
            "• `/crazy [times]` — the crazy copypasta (1–3)",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📊 Status",
          value: ["• `/status` — uptime + who made the bot", "• `/ping` — bot latency"].join("\n"),
          inline: false,
        },
        {
          name: "🗒️ TODOs (Global)",
          value: [
            "• `/todo_add <text>` — add a TODO (Manage Server / Owner)",
            "• `/todo_list [all]` — list global TODOs (Manage Server / Owner)",
            "• `/todo_done <id>` — mark a TODO done (Manage Server / Owner)",
          ].join("\n"),
          inline: false,
        }
      );

    if (isGuild) {
      embed.addFields({
        name: "🛠️ Content (Admin)",
        value: [
          "• `/add_compliment <text>` — add a compliment (Manage Server / Owner)",
          "• `/add_roast <text>` — add a roast (Manage Server / Owner)",
          "• `/list_compliments [page]` — list saved compliments (Admin)",
          "• `/list_roasts [page]` — list saved roasts (Admin)",
        ].join("\n"),
        inline: false,
      });

      if (ownerOnly) {
        embed.addFields({
          name: "🚀 Deploy Updates (Owner Only)",
          value: [
            "• `/set_deploy_channel #channel` — set deploy updates channel",
            "• `/show_deploy_channel` — show current deploy channel",
            "• `/reset_deploy_channel` — reset deploy channel",
          ].join("\n"),
          inline: false,
        });
      }
    }

    embed.setFooter({ text: `Made by ${ownerDisplay}` });
    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
