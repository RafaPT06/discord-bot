require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
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

  // ✅ NEW: /ping
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
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands });
  console.log("✅ Global commands registered.");
})();
