const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { initDb } = require("./db");
const { attachErrorAlerts } = require("./services/errorAlerts");
const { startRobloxAlerts } = require("./services/robloxAlerts");
const { startBackupScheduler } = require("./services/backupScheduler");
const { sendDeployNotices } = require("./services/deployNotifier");
const { canRunCommand } = require("./services/commandPerms");
const { logCommandUsage } = require("./services/usageLogger");
const { getMaintenanceEnabled } = require("./services/maintenance");
const { sendFeed } = require("./services/feed");
const { checkCooldown } = require("./services/cooldowns");
const { fieldsEmbed, errorEmbed } = require("./utils/embeds");

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
  startBackupScheduler(client);
  await sendDeployNotices(client);
  console.log(" DB init + services started");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {

    if (interaction.isAutocomplete && interaction.isAutocomplete()) {
      try {
        const focused = interaction.options.getFocused(true);
        if (focused?.name !== "command") return;

        const q = String(focused.value || "").toLowerCase();
        const names = Array.from(client.commands.keys()).sort();
        const choices = names
          .filter((n) => n.toLowerCase().includes(q))
          .slice(0, 25)
          .map((n) => ({ name: n, value: n }));

        return interaction.respond(choices).catch(() => {});
      } catch {
        return;
      }
    }

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
      // Cooldowns (owner bypass)
      if (!isOwner) {
        const noCooldown = new Set(["help","help_admin","help_owner","status","ping","diag","maintenance"]);
        if (!noCooldown.has(interaction.commandName)) {
          const cd = checkCooldown({ userId: interaction.user.id, commandName: interaction.commandName });
          if (!cd.ok) {
            const secs = Math.ceil(cd.remainingMs / 1000);
            return interaction.reply({ content: `Error: Command on cooldown. Try again in ${secs}s.`, ephemeral: true });
          }
        }
      }


      try {
        await cmd.execute(interaction, client);
        // Feed: activity (level 3)
        try {
          const embed = fieldsEmbed("Command Executed", [
            { name: "User", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Command", value: `/${interaction.commandName}`, inline: true },
            { name: "Result", value: "success", inline: true },
          ]);
          await sendFeed(client, interaction.guildId, 3, embed);
        } catch {}
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
        // Feed: critical (level 1)
        try {
          const embed = errorEmbed("Command Failed", `/${interaction.commandName} failed for <@${interaction.user.id}>`);
          await sendFeed(client, interaction.guildId, 1, embed);
        } catch {}
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
