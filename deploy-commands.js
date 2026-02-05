require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./src/commands/definitions");

const token = process.env.BOT_TOKEN;
const appId = process.env.APP_ID;
const guildId = process.env.TEST_GUILD_ID;

if (!token || !appId) {
  console.error("Missing BOT_TOKEN or APP_ID");
  process.exit(1);
}

async function main() {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
      console.log(`✅ Deployed ${commands.length} commands to guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log(`✅ Deployed ${commands.length} global commands`);
      console.log("Note: global commands can take time to appear. Use TEST_GUILD_ID for instant deploy.");
    }
  } catch (err) {
    console.error("❌ Deploy failed:", err);
    process.exit(1);
  }
}

main();
