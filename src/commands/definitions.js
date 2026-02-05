const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

function cmd(b) { return b.toJSON(); }

module.exports = [
  cmd(new SlashCommandBuilder().setName("help").setDescription("Shows a list of commands.")),
  cmd(new SlashCommandBuilder().setName("status").setDescription("Shows bot status.")),

  cmd(new SlashCommandBuilder()
    .setName("add_roast")
    .setDescription("Add a roast")
    .addStringOption(o => o.setName("text").setDescription("Roast text").setRequired(true))
  ),
  cmd(new SlashCommandBuilder()
    .setName("add_compliment")
    .setDescription("Add a compliment")
    .addStringOption(o => o.setName("text").setDescription("Compliment text").setRequired(true))
  ),

  cmd(new SlashCommandBuilder().setName("list_roasts").setDescription("List roasts (paged).")),
  cmd(new SlashCommandBuilder().setName("list_compliments").setDescription("List compliments (paged).")),

  cmd(new SlashCommandBuilder()
    .setName("remove_roast")
    .setDescription("Remove a roast by DB id (see list).")
    .addIntegerOption(o => o.setName("id").setDescription("DB id").setRequired(true))
  ),
  cmd(new SlashCommandBuilder()
    .setName("remove_compliment")
    .setDescription("Remove a compliment by DB id (see list).")
    .addIntegerOption(o => o.setName("id").setDescription("DB id").setRequired(true))
  ),

  cmd(new SlashCommandBuilder().setName("roblox_status").setDescription("Show Roblox presence (owner only).")),

  // Roblox alert channel commands (owner only)
  cmd(new SlashCommandBuilder()
    .setName("set_roblox_alert_channel")
    .setDescription("Set the channel for Roblox presence alerts (owner only).")
    .addChannelOption(o => o
      .setName("channel")
      .setDescription("Channel to post alerts in")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
    )
  ),
  cmd(new SlashCommandBuilder().setName("show_roblox_alert_channel").setDescription("Show Roblox alert channel (owner only).")),
  cmd(new SlashCommandBuilder().setName("reset_roblox_alert_channel").setDescription("Disable Roblox alerts (owner only).")),

  // Error alert channel commands (owner only)
  cmd(new SlashCommandBuilder()
    .setName("set_error_alert_channel")
    .setDescription("Set the channel for error alerts (owner only).")
    .addChannelOption(o => o
      .setName("channel")
      .setDescription("Channel to post error alerts in")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
    )
  ),
  cmd(new SlashCommandBuilder().setName("show_error_alert_channel").setDescription("Show error alert channel (owner only).")),
  cmd(new SlashCommandBuilder().setName("reset_error_alert_channel").setDescription("Disable error alerts (owner only).")),
  cmd(new SlashCommandBuilder().setName("test_error_alert").setDescription("Send a test error alert (owner only).")),
];
