require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
  ChannelType,
} = require("discord.js");

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

  // Deploy-channel commands (guild-only)
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

new SlashCommandBuilder()
  .setName("todo_add")
  .setDescription("Add a TODO item for this server.")
  .addStringOption((o) =>
    o.setName("text").setDescription("What needs to be done").setRequired(true)
  )
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
  .toJSON(),

new SlashCommandBuilder()
  .setName("todo_list")
  .setDescription("List TODO items for this server.")
  .addBooleanOption((o) =>
    o.setName("all").setDescription("Include done items").setRequired(false)
  )
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
  .toJSON(),

new SlashCommandBuilder()
  .setName("todo_done")
  .setDescription("Mark a TODO as done.")
  .addIntegerOption((o) =>
    o.setName("id").setDescription("TODO id").setRequired(true)
  )
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
  .toJSON(),

,
new SlashCommandBuilder()
  .setName("add_compliment")
  .setDescription("Add a compliment (Manage Server / Owner).")
  .addStringOption((o) =>
    o.setName("text").setDescription("Compliment text").setRequired(true)
  )
  .setContexts(InteractionContextType.Guild)
  .toJSON(),

new SlashCommandBuilder()
  .setName("add_roast")
  .setDescription("Add a roast (Manage Server / Owner).")
  .addStringOption((o) =>
    o.setName("text").setDescription("Roast text").setRequired(true)
  )
  .setContexts(InteractionContextType.Guild)
  .toJSON(),

new SlashCommandBuilder()
  .setName("list_compliments")
  .setDescription("List saved compliments (Admin).")
  .addIntegerOption((o) =>
    o.setName("page").setDescription("Page number (default 1)").setRequired(false)
  )
  .setContexts(InteractionContextType.Guild)
  .toJSON(),

new SlashCommandBuilder()
  .setName("list_roasts")
  .setDescription("List saved roasts (Admin).")
  .addIntegerOption((o) =>
    o.setName("page").setDescription("Page number (default 1)").setRequired(false)
  )
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

// runnable directly
if (require.main === module) {
  deployCommands().then((ok) => process.exit(ok ? 0 : 1));
}

// importable
module.exports = { deployCommands, commands };
