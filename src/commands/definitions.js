const { SlashCommandBuilder, ChannelType } = require("discord.js");
function cmd(b){ return b.toJSON(); }

module.exports = [
  // Fun / Social
  cmd(new SlashCommandBuilder().setName("compliment").setDescription("Send a random compliment.").addUserOption(o=>o.setName("user").setDescription("Who to compliment").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("roast").setDescription("Roast someone 🔥").addUserOption(o=>o.setName("user").setDescription("Who to roast").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("mimic").setDescription("SpOnGeBoB cAsE").addStringOption(o=>o.setName("text").setDescription("Text to mimic").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("cat").setDescription("Random chaotic cat 🐱")),
  cmd(new SlashCommandBuilder().setName("crazy").setDescription("The crazy copypasta (1–3)").addIntegerOption(o=>o.setName("times").setDescription("Repeat 1–3").setRequired(false))),

  // Status
  cmd(new SlashCommandBuilder().setName("status").setDescription("Uptime + ping + runtime info.")),
  cmd(new SlashCommandBuilder().setName("ping").setDescription("Bot latency.")),
  cmd(new SlashCommandBuilder().setName("roblox_status").setDescription("Roblox online/in-game status (Owner).")),

  // TODOs
  cmd(new SlashCommandBuilder().setName("todo_add").setDescription("Add a TODO (Manage Server / Owner).").addStringOption(o=>o.setName("text").setDescription("TODO text").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("todo_list").setDescription("List global TODOs (Manage Server / Owner).").addBooleanOption(o=>o.setName("all").setDescription("Include done items").setRequired(false))),
  cmd(new SlashCommandBuilder().setName("todo_done").setDescription("Mark a TODO done (Manage Server / Owner).").addIntegerOption(o=>o.setName("id").setDescription("TODO id").setRequired(true))),

  // Content (Admin)
  cmd(new SlashCommandBuilder().setName("add_compliment").setDescription("Add a compliment (Manage Server / Owner).").addStringOption(o=>o.setName("text").setDescription("Compliment text").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("add_roast").setDescription("Add a roast (Manage Server / Owner).").addStringOption(o=>o.setName("text").setDescription("Roast text").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("list_compliments").setDescription("List saved compliments (Admin).")),
  cmd(new SlashCommandBuilder().setName("list_roasts").setDescription("List saved roasts (Admin).")),
  cmd(new SlashCommandBuilder().setName("remove_compliment").setDescription("Remove a compliment by id (Manage Server / Owner).").addIntegerOption(o=>o.setName("id").setDescription("Compliment id").setRequired(true))),
  cmd(new SlashCommandBuilder().setName("remove_roast").setDescription("Remove a roast by id (Manage Server / Owner).").addIntegerOption(o=>o.setName("id").setDescription("Roast id").setRequired(true))),

  // Deploy Updates
  cmd(new SlashCommandBuilder().setName("set_deploy_channel").setDescription("Set deploy updates channel (Manage Server / Owner).").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))),
  cmd(new SlashCommandBuilder().setName("show_deploy_channel").setDescription("Show current deploy updates channel (Manage Server / Owner).")),
  cmd(new SlashCommandBuilder().setName("reset_deploy_channel").setDescription("Reset deploy updates channel (Manage Server / Owner).")),

  // Roblox Alerts (Owner)
  cmd(new SlashCommandBuilder().setName("set_roblox_alert_channel").setDescription("Set Roblox alert channel (Owner).").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))),
  cmd(new SlashCommandBuilder().setName("show_roblox_alert_channel").setDescription("Show Roblox alert channel (Owner).")),
  cmd(new SlashCommandBuilder().setName("reset_roblox_alert_channel").setDescription("Reset Roblox alert channel (Owner).")),

  // Error Alerts (Owner)
  cmd(new SlashCommandBuilder().setName("set_error_alert_channel").setDescription("Set error alert channel (Owner).").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))),
  cmd(new SlashCommandBuilder().setName("show_error_alert_channel").setDescription("Show error alert channel (Owner).")),
  cmd(new SlashCommandBuilder().setName("reset_error_alert_channel").setDescription("Reset error alert channel (Owner).")),
  cmd(new SlashCommandBuilder().setName("test_error_alert").setDescription("Send a test error alert (Owner).")),

  cmd(new SlashCommandBuilder().setName("bot_stats").setDescription("Show bot usage stats (Owner).")),

  // Help
  cmd(new SlashCommandBuilder().setName("help").setDescription("Show all commands grouped (like the screenshot).")),
];
