require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
  ChannelType,
} = require("discord.js");

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Shows help.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).toJSON(),

  new SlashCommandBuilder().setName("status").setDescription("Shows uptime.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).toJSON(),

  new SlashCommandBuilder().setName("ping").setDescription("Bot latency.")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).toJSON(),

  new SlashCommandBuilder()
    .setName("set_deploy_channel")
    .setDescription("Set deploy updates channel.")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Target channel")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("show_deploy_channel")
    .setDescription("Show deploy updates channel.")
    .setContexts(InteractionContextType.Guild)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("reset_deploy_channel")
    .setDescription("Reset deploy updates channel.")
    .setContexts(InteractionContextType.Guild)
    .toJSON(),
];

async function deployCommands() {
  const token = process.env.BOT_TOKEN;
  const appId = process.env.APP_ID;
  if (!token || !appId) {
    console.warn("⚠️ BOT_TOKEN or APP_ID missing");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationCommands(appId), { body: commands });
  console.log("✅ Global commands registered.");
}

// run directly
if (require.main === module) {
  deployCommands().catch(console.error);
}

// export for index.js if needed
module.exports = { deployCommands, commands };
