const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Show all commands grouped (like the screenshot)."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Commands")
      .setDescription([
        "✨ **Fun / Social**",
        "• `/compliment [user]` — send a random compliment",
        "• `/roast [user]` — roast someone 🔥",
        "• `/mimic <text>` — SpOnGeBoB cAsE",
        "• `/cat` — random chaotic cat 🐱",
        "",
        "📊 **Status**",
        "• `/status` — uptime + ping + runtime info",
        "• /bot_stats — bot stats (**Owner**)",
        "• `/ping` — bot latency",
        "• `/roblox_status` — Roblox online/in-game status (**Owner**)",
        "• `/bot_stats` — bot stats (**Owner**)",
        "",
        "🗒️ **TODOs (Global)**",
        "• `/todo_add <text>` — add a TODO (**Manage Server / Owner**)",
        "• `/todo_list [all]` — list global TODOs (**Manage Server / Owner**)",
        "• `/todo_done <id>` — mark a TODO done (**Manage Server / Owner**)",
        "",
        "🛠️ **Content (Admin)**",
        "• `/add_compliment <text>` — add a compliment (**Manage Server / Owner**)",
        "• `/add_roast <text>` — add a roast (**Manage Server / Owner**)",
        "• `/list_compliments` — list saved compliments (**Admin**)",
        "• `/list_roasts` — list saved roasts (**Admin**)",
        "• `/remove_compliment <id>` — remove a compliment (**Manage Server / Owner**)",
        "• `/remove_roast <id>` — remove a roast (**Manage Server / Owner**)",
        "",
        "🚀 **Deploy Updates**",
        "• `/set_deploy_channel #channel` — set deploy updates channel (**Manage Server / Owner**)",
        "• `/show_deploy_channel` — show current deploy channel",
        "• `/reset_deploy_channel` — reset deploy channel",
        "",
        "🔔 **Roblox Alerts (Owner)**",
        "• `/set_roblox_alert_channel #channel`",
        "• `/show_roblox_alert_channel`",
        "• `/reset_roblox_alert_channel`",
        "",
        "🚨 **Error Alerts (Owner)**",
        "• `/set_error_alert_channel #channel`",
        "• `/show_error_alert_channel`",
        "• `/reset_error_alert_channel`",
        "• `/test_error_alert`",
"",
"🔐 **Permissions**",
"• `/perm_set command role [allow_manage_server]` — set allowed roles (**Manage Server / Owner**)",
"• `/perm_add_role command role` — add another role (**Manage Server / Owner**)",
"• `/perm_show command` — show rule (**Manage Server / Owner**)",
"• `/perm_list` — list all custom rules (**Manage Server / Owner**)",
"• `/perm_clear command` — clear rule (**Manage Server / Owner**)",
      ].join("\n"));

    return interaction.reply({ embeds: [embed], ephemeral: false });
  }
};
