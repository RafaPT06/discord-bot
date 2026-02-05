const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { initDb } = require("./db");
const { attachErrorAlerts } = require("./services/errorAlerts");
const { startRobloxAlerts } = require("./services/robloxAlerts");
const { sendDeployNotices } = require("./services/deployNotifier");

const token = process.env.BOT_TOKEN;
const ownerId = process.env.OWNER_ID;
const databaseUrl = process.env.DATABASE_URL;

if (!token) throw new Error("Missing BOT_TOKEN");
if (!ownerId) throw new Error("Missing OWNER_ID");
if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// Load commands
const cmdDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith(".js") && f !== "definitions.js")) {
  const mod = require(path.join(cmdDir, file));
  if (mod?.data?.name && typeof mod.execute === "function") client.commands.set(mod.data.name, mod);
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await initDb();
  attachErrorAlerts(client);
  startRobloxAlerts(client);
  await sendDeployNotices(client);
  console.log("✅ DB init + services started");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      return await cmd.execute(interaction, client);
    }

    if (interaction.isButton()) {
      const [kind, ...rest] = interaction.customId.split(":");
      if (kind === "list") {
        const type = rest[0];
        const offset = parseInt(rest[1] || "0", 10) || 0;
        const { handleListButton } = require("./handlers/listButtons");
        return handleListButton(interaction, type, offset);
      }
      if (kind === "roblox" && rest[0] === "refresh") {
        const { handleRobloxRefresh } = require("./handlers/robloxButtons");
        return handleRobloxRefresh(interaction, client);
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const msg = err?.message || "Unknown error";
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: `❌ ${msg}`, ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content: `❌ ${msg}`, ephemeral: true }).catch(() => {});
        }
      }
    } catch {}
  }
});

client.login(token);
