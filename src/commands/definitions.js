const { SlashCommandBuilder, ChannelType, InteractionContextType } = require("discord.js");
function cmd(b) {
  return b.toJSON();
}

module.exports = [
  // Fun / Social
  cmd(
    new SlashCommandBuilder()
      .setName("compliment")
      .setDescription("Send a random compliment.")
      
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      .addUserOption((o) =>
        o.setName("user").setDescription("Who to compliment").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("roast")
      .setDescription("Roast someone ")
      
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      .addUserOption((o) =>
        o.setName("user").setDescription("Who to roast").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("mimic")
      .setDescription("SpOnGeBoB cAsE")
      
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      .addStringOption((o) =>
        o.setName("text").setDescription("Text to mimic").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("cat")
      .setDescription("Random chaotic cat ")
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      ,
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("crazy")
      .setDescription("The classic 'crazy' copypasta (rats version)")
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      ,
  ),
  // Status
  cmd(
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Uptime + ping + runtime info."),
  ),
  cmd(new SlashCommandBuilder().setName("ping").setDescription("Bot latency.")),
  cmd(new SlashCommandBuilder().setName("maintenance").setDescription("Toggle maintenance mode (Owner for on/off).").addStringOption(o=>o.setName("action").setDescription("on | off | status").setRequired(true).addChoices({ name: "on", value: "on" },{ name: "off", value: "off" },{ name: "status", value: "status" }))),
  cmd(
    new SlashCommandBuilder()
      .setName("roblox_status")
      .setDescription("Roblox online/in-game status (Owner)."),
  ),

  cmd(
    new SlashCommandBuilder()
      .setName("diag")
      .setDescription("Diagnostics: checks bot health + configuration (Manage Server / Owner)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("sys")
      .setDescription("System panel: health + configuration summary (Manage Server / Owner)."),
  ),

  // TODOs
  cmd(
    new SlashCommandBuilder()
      .setName("todo_add")
      .setDescription("Add a TODO (Manage Server / Owner).")
      .addStringOption((o) =>
        o.setName("text").setDescription("TODO text").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("todo_list")
      .setDescription("List global TODOs (Manage Server / Owner).")
      .addBooleanOption((o) =>
        o
          .setName("all")
          .setDescription("Include done items")
          .setRequired(false),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("todo_done")
      .setDescription("Mark a TODO done (Manage Server / Owner).")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("TODO id").setRequired(true),
      ),
  ),

  // Content (Admin)
  cmd(
    new SlashCommandBuilder()
      .setName("add_compliment")
      .setDescription("Add a compliment (Manage Server / Owner).")
      .addStringOption((o) =>
        o.setName("text").setDescription("Compliment text").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("add_roast")
      .setDescription("Add a roast (Manage Server / Owner).")
      .addStringOption((o) =>
        o.setName("text").setDescription("Roast text").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("list_compliments")
      .setDescription("List saved compliments (Admin)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("list_roasts")
      .setDescription("List saved roasts (Admin)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("remove_compliment")
      .setDescription("Remove a compliment by id (Manage Server / Owner).")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Compliment id").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("remove_roast")
      .setDescription("Remove a roast by id (Manage Server / Owner).")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Roast id").setRequired(true),
      ),
  ),

  // Deploy Updates
  cmd(
    new SlashCommandBuilder()
      .setName("set_deploy_channel")
      .setDescription("Set deploy updates channel (Manage Server / Owner).")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("show_deploy_channel")
      .setDescription(
        "Show current deploy updates channel (Manage Server / Owner).",
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("reset_deploy_channel")
      .setDescription("Reset deploy updates channel (Manage Server / Owner)."),
  ),

  
cmd(
  new SlashCommandBuilder()
    .setName("deploy_test")
    .setDescription("Send a test deploy notification (restricted)."),
),

// Roblox Alerts (Owner)
  cmd(
    new SlashCommandBuilder()
      .setName("set_roblox_alert_channel")
      .setDescription("Set Roblox alert channel (Owner).")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("show_roblox_alert_channel")
      .setDescription("Show Roblox alert channel (Owner)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("reset_roblox_alert_channel")
      .setDescription("Reset Roblox alert channel (Owner)."),
  ),

  // Error Alerts (Owner)
  cmd(
    new SlashCommandBuilder()
      .setName("set_error_alert_channel")
      .setDescription("Set error alert channel (Owner).")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("show_error_alert_channel")
      .setDescription("Show error alert channel (Owner)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("reset_error_alert_channel")
      .setDescription("Reset error alert channel (Owner)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("test_error_alert")
      .setDescription("Send a test error alert (Owner)."),
  ),

  // Permissions (Manage Server / Owner)
  cmd(
    new SlashCommandBuilder()
      .setName("perm_set")
      .setDescription("Set command permissions (Manage Server / Owner).")
      .addStringOption((o) =>
        o
          .setName("command")
          .setDescription("Command name (no slash)")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addRoleOption((o) =>
        o.setName("role").setDescription("Role allowed").setRequired(true),
      )
      .addBooleanOption((o) =>
        o
          .setName("allow_manage_server")
          .setDescription("Allow Manage Server bypass")
          .setRequired(false),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("perm_add_role")
      .setDescription(
        "Add an allowed role to a command (Manage Server / Owner).",
      )
      .addStringOption((o) =>
        o
          .setName("command")
          .setDescription("Command name (no slash)")
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addRoleOption((o) =>
        o.setName("role").setDescription("Role allowed").setRequired(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("perm_show")
      .setDescription("Show permissions for a command (Manage Server / Owner).")
      .addStringOption((o) =>
        o
          .setName("command")
          .setDescription("Command name (no slash)")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("perm_list")
      .setDescription(
        "List all commands with custom permission rules (Manage Server / Owner).",
      )
      .addIntegerOption((o) =>
        o
          .setName("page")
          .setDescription("Page number (1, 2, 3...)")
          .setRequired(false)
          .setMinValue(1),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("perm_clear")
      .setDescription(
        "Clear custom permissions for a command (Manage Server / Owner).",
      )
      .addStringOption((o) =>
        o
          .setName("command")
          .setDescription("Command name (no slash)")
          .setRequired(true)
          .setAutocomplete(true),
      ),
  ),

  // Help
  cmd(
    new SlashCommandBuilder()
      .setName("help")
      .setDescription("Show all commands grouped (like the screenshot)")
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
      ,
  ),

  // Backups (Restricted)
  cmd(
    new SlashCommandBuilder()
      .setName("set_backup_channel")
      .setDescription("Set the channel where weekly DB backups will be posted.")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Target channel")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      ),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("show_backup_channel")
      .setDescription("Show the current backup channel (if any)."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("reset_backup_channel")
      .setDescription("Remove/disable weekly backups for this server."),
  ),
  cmd(
    new SlashCommandBuilder()
      .setName("test_backup")
      .setDescription("Send a backup right now to the configured backup channel."),
  ),

// Setup
cmd(
  new SlashCommandBuilder()
    .setName("setup_channels")
    .setDescription("Create a category + system channels and auto-configure them.")
    .addStringOption(o => o.setName("category").setDescription("Category name (default: bot)").setRequired(false))
),
// Help (split)
cmd(
  new SlashCommandBuilder()
    .setName("help_admin")
    .setDescription("Show admin/setup commands (restricted).")
    .setContexts(InteractionContextType.Guild)
),
cmd(
  new SlashCommandBuilder()
    .setName("help_owner")
    .setDescription("Show owner-only commands.")
    .setContexts(InteractionContextType.Guild)
),

// Feed
cmd(new SlashCommandBuilder().setName("set_feed_channel").setDescription("Set bot feed channel.").addChannelOption(o=>o.setName("channel").setDescription("Target channel").setRequired(true).addChannelTypes(ChannelType.GuildText)).setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("show_feed_channel").setDescription("Show bot feed channel.").setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("reset_feed_channel").setDescription("Reset bot feed channel.").setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("feed_level").setDescription("Set feed level (1-3).").addIntegerOption(o=>o.setName("level").setDescription("1-3").setRequired(true).addChoices({name:"1 (Critical)",value:1},{name:"2 (System)",value:2},{name:"3 (Activity)",value:3})).setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("feed_test").setDescription("Send a test feed message.").addIntegerOption(o=>o.setName("level").setDescription("Test level").setRequired(false).addChoices({name:"1 (Critical)",value:1},{name:"2 (System)",value:2},{name:"3 (Activity)",value:3})).setContexts(InteractionContextType.Guild)),

// Simulations (Owner)
cmd(new SlashCommandBuilder().setName("simulate_deploy").setDescription("Owner: simulate deploy notification.").setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("simulate_error").setDescription("Owner: simulate error alert.").setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("simulate_backup").setDescription("Owner: trigger backup post.").setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("simulate_roblox").setDescription("Owner: simulate Roblox alert.").addStringOption(o=>o.setName("status").setDescription("Status").setRequired(true).addChoices({name:"offline",value:"offline"},{name:"online",value:"online"},{name:"ingame",value:"ingame"},{name:"studio",value:"studio"})).setContexts(InteractionContextType.Guild)),
cmd(new SlashCommandBuilder().setName("simulate_feed").setDescription("Owner: simulate feed event.").addIntegerOption(o=>o.setName("level").setDescription("Level").setRequired(true).addChoices({name:"1 (Critical)",value:1},{name:"2 (System)",value:2},{name:"3 (Activity)",value:3})).addStringOption(o=>o.setName("title").setDescription("Title").setRequired(false)).setContexts(InteractionContextType.Guild)),
];