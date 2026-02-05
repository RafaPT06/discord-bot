const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const config = require("./config");
const { startWebServer } = require("./web/server");
const { createPool } = require("./db/pool");
const { initDb, makeDb } = require("./db");
const { notifyOnDeploy } = require("./services/deployNotifier");
const { handleInteraction } = require("./handlers/interaction");
const { getPresenceSummary, presenceLabel } = require("./services/robloxService");


function buildRobloxAlertEmbed(summary) {
  const embed = new EmbedBuilder()
    .setTitle("🎮 Roblox Presence Update")
    .addFields(
      { name: "Account", value: `${summary.username} (id: ${summary.userId})`, inline: false },
      { name: "Status", value: presenceLabel(summary.presenceType), inline: true }
    )
    .setTimestamp(new Date());

  if (summary.experienceName) embed.addFields({ name: "Experience", value: summary.experienceName, inline: false });
  if (summary.lastLocation) embed.addFields({ name: "Location", value: summary.lastLocation, inline: true });
  if (summary.placeId) embed.addFields({ name: "Place ID", value: String(summary.placeId), inline: true });

  if (summary.iconUrl) embed.setThumbnail(summary.iconUrl);

  return embed;
}

function buildRobloxRefreshRow(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rbx_refresh_${ownerId}`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄")
  );
}

/**
 * Poll Roblox presence and announce changes to configured guild channels.
 */
function startRobloxAlertLoop({ client, db, config }) {
  const username = config.ROBLOX_USERNAME || "qxR4F4";
  const ownerId = config.OWNER_ID;

  // cache last status per guild to avoid spam
  const lastByGuild = new Map();

  const intervalMs = 2 * 60 * 1000; // 2 minutes

  setInterval(async () => {
    try {
      const guilds = await db.listRobloxAlertGuilds();
      if (!guilds || guilds.length === 0) return;

      // Fetch once per tick (same username for all guilds)
      const summary = await getPresenceSummary(username);

      for (const g of guilds) {
        const guildId = g.guild_id;
        const channelId = g.roblox_alert_channel_id;
        if (!channelId) continue;

        const prev = lastByGuild.get(guildId);
        const signature = `${summary.presenceType}|${summary.placeId || ""}|${summary.experienceName || ""}`;

        if (prev === signature) continue;
        lastByGuild.set(guildId, signature);

        // On first run per guild, do not announce (prevents spam after deploy)
        if (!prev) continue;

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) continue;

        await channel.send({
          embeds: [buildRobloxAlertEmbed(summary)],
          components: ownerId ? [buildRobloxRefreshRow(ownerId)] : [],
        });
      }
    } catch (e) {
      console.error("Roblox alert loop tick failed:", e);
    }
  }, intervalMs);
}

// Fail fast if token missing (common deploy issue)
if (!config.BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN. Add it to your env vars (.env or Railway Variables)." );
  process.exit(1);
}

// Postgres is required (everything is stored in the database)
if (!config.DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL. Create a Postgres database in Railway and add DATABASE_URL to Variables.");
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

  try {
    startRobloxAlertLoop({ client, db, config });
  } catch (e) {
    console.error("Roblox alert loop start failed:", e);
  }
});

client.login(config.BOT_TOKEN);
