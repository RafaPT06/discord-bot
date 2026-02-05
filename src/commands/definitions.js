const {
  SlashCommandBuilder,
  InteractionContextType,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

function buildCommandsJson() {
  const cmds = [
    // =========================
    // BASE COMMANDS
    // =========================
    new SlashCommandBuilder()
      .setName("help")
      .setDescription("Shows a list of all commands and what they do.")
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Shows uptime + who made the bot.")
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Shows bot latency.")
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),


new SlashCommandBuilder()
  .setName("roblox_status")
  .setDescription("Show Roblox online/in-game status (Owner only).")
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
  ),

    new SlashCommandBuilder()
      .setName("crazy")
      .setDescription("Send the crazy copypasta with buttons (rate-limited).")
      .addIntegerOption((o) => o.setName("times").setDescription("How many cycles (1-3)").setRequired(false))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("compliment")
      .setDescription("Send a random compliment.")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Who to compliment (server only)").setRequired(false)
      )
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("cat")
      .setDescription("Get a random chaotic cat picture.")
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("mimic")
      .setDescription("The bot mimics you in SpOnGeBoB cAsE.")
      .addStringOption((opt) => opt.setName("text").setDescription("The text to mimic").setRequired(true))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("roast")
      .setDescription("The bot roasts someone.")
      .addUserOption((opt) => opt.setName("user").setDescription("Who to roast").setRequired(false))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    // =========================
    // DEPLOY UPDATES (guild only)
    // =========================
    new SlashCommandBuilder()
      .setName("set_deploy_channel")
      .setDescription("Set the channel for deployment updates.")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to post deploy updates in")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("show_deploy_channel")
      .setDescription("Show the current deployment updates channel.")
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("reset_deploy_channel")
      .setDescription("Reset the deployment updates channel for this server.")
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    // =========================
    // TODO (global list, but usable in DMs for owner)
    // =========================
    new SlashCommandBuilder()
      .setName("todo_add")
      .setDescription("Add a TODO item (global list).")
      .addStringOption((opt) => opt.setName("text").setDescription("What needs to be done?").setRequired(true))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("todo_list")
      .setDescription("List TODO items (global list).")
      .addBooleanOption((opt) => opt.setName("all").setDescription("Include completed TODOs as well").setRequired(false))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    new SlashCommandBuilder()
      .setName("todo_done")
      .setDescription("Mark a TODO item as done (global list).")
      .addIntegerOption((opt) => opt.setName("id").setDescription("TODO ID").setRequired(true))
      .setContexts(
        InteractionContextType.Guild,
        InteractionContextType.BotDM,
        InteractionContextType.PrivateChannel
      ),

    // =========================
    // CONTENT MANAGEMENT (guild only)
    // =========================
    new SlashCommandBuilder()
      .setName("add_compliment")
      .setDescription("Add a compliment (Admin/Owner).")
      .addStringOption((opt) => opt.setName("text").setDescription("Compliment text").setRequired(true))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("add_roast")
      .setDescription("Add a roast (Admin/Owner).")
      .addStringOption((opt) => opt.setName("text").setDescription("Roast text").setRequired(true))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("list_compliments")
      .setDescription("List saved compliments (Admin).")
      .addIntegerOption((opt) => opt.setName("page").setDescription("Page number").setRequired(false))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("list_roasts")
      .setDescription("List saved roasts (Admin).")
      .addIntegerOption((opt) => opt.setName("page").setDescription("Page number").setRequired(false))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("remove_roast")
      .setDescription("Remove a roast by its DB id (Admin).")
      .addIntegerOption((opt) => opt.setName("id").setDescription("Roast DB id shown in /list_roasts").setRequired(true))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
      .setName("remove_compliment")
      .setDescription("Remove a compliment by its DB id (Admin).")
      .addIntegerOption((opt) => opt.setName("id").setDescription("Compliment DB id shown in /list_compliments").setRequired(true))
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  


    // =========================
    // ROBLOX ALERT CHANNEL (owner-only)
    // =========================
    new SlashCommandBuilder()
      .setName("set_roblox_alert_channel")
      .setDescription("Set the channel for Roblox presence change alerts.")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to send Roblox presence alerts")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName("show_roblox_alert_channel")
      .setDescription("Show the current Roblox presence alert channel.")
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName("reset_roblox_alert_channel")
      .setDescription("Clear the Roblox presence alert channel.")
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    ];
  const json = cmds.map((c) => c.toJSON());

  // Hard-fail if anything is missing (prevents the "<1 empty item>" Discord error)
  for (let i = 0; i < json.length; i++) {
    if (!json[i] || !json[i].name) {
      throw new Error(`Command at index ${i} is invalid/empty. Fix src/commands/definitions.js.`);
    }
  }

  return json;
}

module.exports = { buildCommandsJson };
