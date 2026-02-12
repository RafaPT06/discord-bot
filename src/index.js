const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { initDb } = require("./db");
const { attachErrorAlerts } = require("./services/errorAlerts");
const { startRobloxAlerts } = require("./services/robloxAlerts");
const { sendDeployNotices } = require("./services/deployNotifier");
const { canRunCommand } = require("./services/commandPerms");
const { logCommandUsage } = require("./services/usageLogger");
const { getMaintenanceEnabled } = require("./services/maintenance");

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
  console.log(` Logged in as ${client.user.tag}`);
  await initDb();
  attachErrorAlerts(client);
  startRobloxAlerts(client);
  await sendDeployNotices(client);
  console.log(" DB init + services started");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;

      // Hard maintenance mode: blocks everything except /maintenance (Owner can always bypass)
      const maintenanceEnabled = await getMaintenanceEnabled();
      const isOwner = interaction.user?.id === process.env.OWNER_ID;
      const allowDuringMaintenance = interaction.commandName === "maintenance";

      if (maintenanceEnabled && !isOwner && !allowDuringMaintenance) {
        const { createSection } = require("./utils/layout");
        const msg = createSection("Maintenance Mode", [
          { label: "Status", value: "Bot temporarily disabled" },
          { label: "Try again", value: "Later" },
        ]);
        return interaction.reply({ content: msg, ephemeral: true });
      }

      const allowed = await canRunCommand(interaction, interaction.commandName);
      if (!allowed) {
        return interaction.reply({
          content: "Error: You don’t have permission to use this command here.",
          ephemeral: true,
        });
      }

      try {
        await cmd.execute(interaction, client);
        logCommandUsage({
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          ok: true,
        });
      } catch (err) {
        logCommandUsage({
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          ok: false,
          error: err?.message || String(err),
        });
        throw err;
      }
      return;
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
          await interaction.followUp({ content: `Error: ${msg}`, ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ content: `Error: ${msg}`, ephemeral: true }).catch(() => {});
        }
      }
    } catch {}
  }
});


client.login(token);
