require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { ChannelType } =
  require("discord.js");
// Build your commands exactly like before
const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows a list of all commands and what they do.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows uptime + who made the bot.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows bot latency.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("crazy")
    .setDescription("Send the crazy copypasta with buttons (rate-limited).")
    .addIntegerOption((o) =>
      o.setName("times").setDescription("How many cycles (1-3)").setRequired(false)
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

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
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Get a random chaotic cat picture.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("mimic")
    .setDescription("The bot mimics you in SpOnGeBoB cAsE.")
    .addStringOption((opt) =>
      opt.setName("text").setDescription("The text to mimic").setRequired(true)
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("roast")
    .setDescription("The bot roasts someone.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Who to roast").setRequired(false)
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .toJSON(),
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
  .toJSON(),

new SlashCommandBuilder()
  .setName("show_deploy_channel")
  .setDescription("Show the current deployment updates channel.")
  .setContexts(InteractionContextType.Guild)
  .toJSON(),

new SlashCommandBuilder()
  .setName("reset_deploy_channel")
  .setDescription("Reset the deployment updates channel for this server.")
  .setContexts(InteractionContextType.Guild)
  .toJSON(),
];

async function deployCommands() {
  const token = process.env.BOT_TOKEN;
  const appId = process.env.APP_ID;

  if (!token || !appId) {
    console.warn("⚠️ BOT_TOKEN or APP_ID missing — skipping command deploy.");
    return false;
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    console.log("✅ Global commands registered.");
    return true;
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
    return false;
  }
}

// Export for index.js to call
module.exports = { deployCommands, commands };
