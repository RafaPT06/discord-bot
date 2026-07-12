const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");
const { installEmbedTheme } = require("./utils/embedTheme");
installEmbedTheme();
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
const { startPresenceRotation } = require("./services/presenceManager");
const { startDailySentenceDm } = require("./services/dailySentenceDm");
const { startBotApi } = require("./web/api");
const { handleStarboardReaction } = require("./services/starboard");
const { handleLevelMessage } = require("./services/leveling");
const { handleMemberJoin, handleMemberLeave } = require("./services/welcome");
const { handlePrefixMessage } = require("./services/prefixCommands");
const {
  handleLoggedMessageDelete,
  handleLoggedMessageUpdate,
  handleLoggedMemberJoin,
  handleLoggedMemberLeave,
  handleLoggedGuildBan,
  handleLoggedVoiceState,
  handleModerationMessage,
} = require("./services/dashboardEvents");

const token = process.env.BOT_TOKEN;
const ownerId = process.env.OWNER_ID;
const databaseUrl = process.env.DATABASE_URL;
const botApiToken = process.env.BOT_API_TOKEN;
const hostedProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production"
  || Boolean(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_SERVICE_ID);

if (!token) throw new Error("Missing BOT_TOKEN");
if (!ownerId) throw new Error("Missing OWNER_ID");
if (!databaseUrl) throw new Error("Missing DATABASE_URL");
if (hostedProduction && !botApiToken) {
  console.warn("Warning: BOT_API_TOKEN is missing. Configure the same token on the bot and website Railway services to secure the bot API.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildModeration],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
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
  startBotApi(client);
  startPresenceRotation(client);
  startDailySentenceDm(client);
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
        const noCooldown = new Set(["help","ping","maintenance","panel"]);
        if (!noCooldown.has(interaction.commandName)) {
          const cd = checkCooldown({ userId: interaction.user.id, commandName: interaction.commandName });
          if (!cd.ok) {
            const secs = Math.ceil(cd.remainingMs / 1000);
            return interaction.reply({ content: `Error: Command on cooldown. Try again in ${secs}s.`, ephemeral: true });
          }
        }
      }


      const commandStartedAt = Date.now();
      try {
        await cmd.execute(interaction, client);
        const durationMs = Date.now() - commandStartedAt;
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
          durationMs,
        });
      } catch (err) {
        logCommandUsage({
          guildId: interaction.guildId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          ok: false,
          error: err?.message || String(err),
          durationMs: Date.now() - commandStartedAt,
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

    
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "panel_select") {
        const { handlePanelSelect } = require("./handlers/panelSelect");
        return handlePanelSelect(interaction, client);
      }
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

      if (kind === "help") {
        const { handleHelpButton } = require("./handlers/helpButtons");
        return handleHelpButton(interaction);
      }

      if (kind === "panel") {
        const { handlePanelButton } = require("./handlers/panelButtons");
        return handlePanelButton(interaction, client);
      }

      if (kind === "panelact") {
        const { handlePanelAction } = require("./handlers/panelActionButtons");
        return handlePanelAction(interaction, client);
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


client.on(Events.MessageCreate, async (message) => {
  try {
    const handledPrefix = await handlePrefixMessage(client, message);
    if (handledPrefix) return;
  } catch (err) {
    console.error("Prefix command error:", err);
  }

  try {
    const moderated = await handleModerationMessage(message);
    if (moderated) return;
  } catch (err) {
    console.error("Moderation error:", err);
  }

  try {
    await handleLevelMessage(client, message);
  } catch (err) {
    console.error("Leveling error:", err);
  }
});


client.on(Events.GuildMemberAdd, async (member) => {
  const [welcomeResult, logResult] = await Promise.allSettled([
    handleMemberJoin(member),
    handleLoggedMemberJoin(member),
  ]);
  if (welcomeResult.status === "rejected") console.error("Welcome message error:", welcomeResult.reason);
  if (logResult.status === "rejected") console.error("Member join log error:", logResult.reason);
});

client.on(Events.GuildMemberRemove, async (member) => {
  const [goodbyeResult, logResult] = await Promise.allSettled([
    handleMemberLeave(member),
    handleLoggedMemberLeave(member),
  ]);
  if (goodbyeResult.status === "rejected") console.error("Goodbye message error:", goodbyeResult.reason);
  if (logResult.status === "rejected") console.error("Member leave log error:", logResult.reason);
});


client.on(Events.MessageDelete, async (message) => {
  try {
    await handleLoggedMessageDelete(message);
  } catch (err) {
    console.error("Message delete log error:", err);
  }
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  try {
    await handleLoggedMessageUpdate(oldMessage, newMessage);
  } catch (err) {
    console.error("Message update log error:", err);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    await handleLoggedVoiceState(oldState, newState);
  } catch (err) {
    console.error("Voice log error:", err);
  }
});

client.on(Events.GuildBanAdd, async (ban) => {
  try {
    await handleLoggedGuildBan(ban);
  } catch (err) {
    console.error("Ban log error:", err);
  }
});


client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    await handleStarboardReaction(client, reaction, user);
  } catch (err) {
    console.error("Starboard reaction error:", err);
  }
});

client.login(token);
