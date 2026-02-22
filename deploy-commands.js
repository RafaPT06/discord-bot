require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const token = process.env.BOT_TOKEN;
const appId = process.env.APP_ID;
const guildId = process.env.TEST_GUILD_ID;

if (!token || !appId) {
  console.error("Missing BOT_TOKEN or APP_ID");
  process.exit(1);
}

function loadCommandJson() {
  const cmdDir = path.join(__dirname, "src", "commands");
  const files = fs
    .readdirSync(cmdDir)
    .filter((f) => f.endsWith(".js") && f !== "definitions.js");

  const out = [];
  for (const f of files) {
    const mod = require(path.join(cmdDir, f));
    if (!mod?.data?.name || typeof mod.execute !== "function") continue;
    out.push(mod.data.toJSON());
  }
  return out;
}

(async () => {
  try {
    const rest = new REST({ version: "10" }).setToken(token);
    const commands = loadCommandJson();

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
      console.log(`Deployed ${commands.length} guild commands to ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log(`Deployed ${commands.length} global commands`);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
