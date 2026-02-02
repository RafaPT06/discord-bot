const { Client, GatewayIntentBits, Events } = require("discord.js");

const config = require("./config");
const { startWebServer } = require("./web/server");
const { createPool } = require("./db/pool");
const { initDb, makeDb } = require("./db");
const { notifyOnDeploy } = require("./services/deployNotifier");
const { handleInteraction } = require("./handlers/interaction");

// Fail fast if token missing (common deploy issue)
if (!config.BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN. Add it to your env vars (.env or Railway Variables)." );
  process.exit(1);
}

process.on("unhandledRejection", (reason) => console.error("UnhandledRejection:", reason));
process.on("uncaughtException", (err) => console.error("UncaughtException:", err));

// Web server for uptime monitors
startWebServer({ port: config.PORT });

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// DB
const pool = createPool(config.DATABASE_URL);
const db = makeDb(pool);

// In-memory state (cooldowns, etc.)
const state = {
  complimentCooldown: new Map(),
  crazyCooldown: new Map(),
};

const ctx = { client, config, db, state };

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, ctx));

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await initDb(pool);
  } catch (e) {
    console.error("DB init failed:", e);
  }

  try {
    await notifyOnDeploy({ client, db, config });
  } catch (e) {
    console.error("Deploy notify failed:", e);
  }
});

client.login(config.BOT_TOKEN);
