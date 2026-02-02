require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { buildCommandsJson } = require("./commands/definitions");

// Optional: set this to deploy instantly to one server while testing.
// If not set, commands are deployed globally (can take time to appear everywhere).
const TEST_GUILD_ID = process.env.TEST_GUILD_ID;

async function deployCommands() {
  const token = process.env.BOT_TOKEN;
  const appId = process.env.APP_ID;

  if (!token || !appId) {
    console.error("❌ Missing BOT_TOKEN or APP_ID in environment.");
    process.exit(1);
  }

  const body = buildCommandsJson();
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    if (TEST_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(appId, TEST_GUILD_ID), { body });
      console.log(`✅ Guild commands deployed instantly to TEST_GUILD_ID=${TEST_GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(appId), { body });
      console.log("✅ Global commands deployed (may take time to appear everywhere)." );
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
    process.exit(1);
  }
}

deployCommands();
