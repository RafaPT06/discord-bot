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

function loadCommands() {
  const dir = path.join(__dirname, "src", "commands");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") && f !== "definitions.js");
  const cmds = [];
  for (const f of files) {
    const mod = require(path.join(dir, f));
    if (mod?.data && typeof mod.data.toJSON === "function") cmds.push(mod.data.toJSON());
  }
  return cmds;
}

(async () => {
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = loadCommands();

  try {
    console.log(`Deploying ${commands.length} commands...`);

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
      console.log(`Deployed to guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log("Deployed globally");
    }
  } catch (err) {
    console.error("Deploy failed:", err);
    process.exit(1);
  }
})();
