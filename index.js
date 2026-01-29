require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// =======================
// WEB SERVER (keep-alive)
// =======================
const app = express();
const PORT = Number(process.env.PORT || 8080);

app.get("/", (req, res) => res.status(200).send("Bot is alive! 🤖"));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =======================
// CONFIG
// =======================
const OWNER_ID = process.env.OWNER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // fallback if DB not set
const TZ = process.env.TZ || "Europe/Lisbon";
const ownerDisplay = "Rafa (atuaprima_)";
const ownerDisplayId = `Rafa (<@${OWNER_ID}>)`;

// =======================
// FILES
// =======================
const COMPLIMENTS_FILE = path.join(__dirname, "compliments.txt");

// =======================
// DATABASE (PostgreSQL) - per server deploy channel
// =======================
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

async function initDb() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      deploy_channel_id TEXT
    );
  `);

await pool.query(`
  CREATE TABLE IF NOT EXISTS todo_items (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    text TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
}

async function dbSetDeployChannel(guildId, channelId) {
  if (!pool) return;
  await pool.query(
    `
    INSERT INTO guild_settings (guild_id, deploy_channel_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id)
    DO UPDATE SET deploy_channel_id = EXCLUDED.deploy_channel_id;
    `,
    [guildId, channelId]
  );
}

async function dbGetDeployChannel(guildId) {
  if (!pool) return null;
  const res = await pool.query(
    `SELECT deploy_channel_id FROM guild_settings WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0]?.deploy_channel_id ?? null;
}

async function dbResetDeployChannel(guildId) {
  if (!pool) return;
  await pool.query(
    `UPDATE guild_settings SET deploy_channel_id = NULL WHERE guild_id = $1`,
    [guildId]
  );
}

async function dbGetAllDeployChannels() {
  if (!pool) return [];
  const res = await pool.query(
    `SELECT deploy_channel_id FROM guild_settings WHERE deploy_channel_id IS NOT NULL`
  );
  return res.rows;
}


async function dbAddTodo(guildId, text, userId) {
  if (!pool) return null;
  const res = await pool.query(
    `INSERT INTO todo_items (guild_id, text, created_by)
     VALUES ($1,$2,$3)
     RETURNING id`,
    [guildId, text, userId]
  );
  return res.rows[0]?.id ?? null;
}

async function dbListTodos(guildId, includeDone = false, limit = 20) {
  if (!pool) return [];
  const res = await pool.query(
    `SELECT id, text, is_done FROM todo_items
     WHERE guild_id=$1 AND ($2 OR is_done = FALSE)
     ORDER BY is_done ASC, id DESC
     LIMIT $3`,
    [guildId, includeDone, limit]
  );
  return res.rows;
}

async function dbDoneTodo(guildId, id) {
  if (!pool) return false;
  const res = await pool.query(
    `UPDATE todo_items SET is_done=TRUE
     WHERE guild_id=$1 AND id=$2`,
    [guildId, id]
  );
  return (res.rowCount ?? 0) > 0;
}

function isOwner(interaction) {
  return OWNER_ID && interaction.user.id === OWNER_ID;
}

function canManageTodos(interaction) {
  if (!interaction.inGuild()) return false;
  return (
    isOwner(interaction) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

// =======================
// DEPLOY INFO (GitHub commit)
// =======================
function getRailwayEnvName() {
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENV_NAME ||
    "unknown"
  );
}

async function getCommitInfo(sha) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "username/repo"
  if (!token || !repo) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "railway-discord-bot",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      message: data.commit.message.split("\n")[0],
      author: data.commit.author.name,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

async function notifyOnDeploy() {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const ts = Math.floor(Date.now() / 1000);

  const envName = getRailwayEnvName();
  const shortSha = sha ? sha.slice(0, 7) : null;
  const commitInfo = sha ? await getCommitInfo(sha) : null;

  const message =
    `**New deploy detected!**\n` +
    `• **Env:** \`${envName}\`\n` +
    (shortSha ? `• **Commit:** \`${shortSha}\`\n` : "") +
    (commitInfo
      ? `• **Change:** ${commitInfo.message}\n` +
        `• **Author:** ${commitInfo.author}\n` +
        `• **GitHub:** ${commitInfo.url}\n`
      : "") +
    `• **Node:** \`${process.version}\`\n` +
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`;

  // Prefer DB (per server)
  if (pool) {
    try {
      const rows = await dbGetAllDeployChannels();
      for (const row of rows) {
        const ch = await client.channels.fetch(row.deploy_channel_id).catch(() => null);
        if (ch?.isTextBased()) await ch.send(message);
      }
    } catch (e) {
      console.error("Deploy notify (DB) failed:", e);
    }
    return;
  }

  // Fallback to env channel
  if (CHANNEL_ID) {
    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) await ch.send(message);
  }
}

// =======================
// HELPERS
// =======================
function loadCompliments() {
  try {
    return fs
      .readFileSync(COMPLIMENTS_FILE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toSpongeCase(text) {
  return text
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join("");
}

// =======================
// COOLDOWNS + CRAZY PACK
// =======================
const complimentCooldown = new Map();
const COMPLIMENT_COOLDOWN_MS = 10_000;

const crazyCooldown = new Map();
const CRAZY_COOLDOWN_MS = 15_000;
const CRAZY_MAX_TIMES = 3;
const CRAZY_MAX_TOTAL_LINES = 25;

function getCrazyPack() {
  return [
    "That's crazy...",
    "Crazy?",
    "I was crazy once.",
    "They locked me in a room.",
    "A rubber room.",
    "A rubber room with rats.",
    "And rats make me crazy.",
  ];
}

const roasts = [
  "I’d agree with you but then we’d both be wrong.",
  "I’m not saying I hate you, but I’d unplug your life support to charge my phone.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I treasure the time I spend with you, but I treasure my sanity more.",
  "You have the perfect face for radio.",
];

// =======================
// INTERACTIONS
// =======================
client.on(Events.InteractionCreate, async (interaction) => {
  // -------- Slash commands --------
  if (interaction.isChatInputCommand()) {
    // OWNER-ONLY deploy commands
    if (interaction.commandName === "set_deploy_channel") {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }
  if (!isOwner(interaction)) {
    return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
  }

  // Try by the expected name first…
  let ch = interaction.options.getChannel("channel");

  // …but if Discord sent it under a different name, grab the first channel option.
  if (!ch) {
    const first = interaction.options.data?.find((o) => o.type === 7); // 7 = CHANNEL
    if (first?.value) ch = await client.channels.fetch(first.value).catch(() => null);
  }

  // Final guard + helpful debug output
  if (!ch?.id) {
    const debug = interaction.options.data?.map(o => ({
      name: o.name, type: o.type, value: o.value
    })) ?? [];

    return interaction.reply({
      content:
        "❌ I didn’t receive a valid channel id from Discord.\n" +
        "Debug (send this to Dinis):\n" +
        "```json\n" + JSON.stringify(debug, null, 2) + "\n```",
      ephemeral: true,
    });
  }

  // Optional: ensure bot can post there
  const me = interaction.guild.members.me;
  const perms = me ? ch.permissionsFor(me) : null;
  if (!perms?.has(["ViewChannel", "SendMessages"])) {
    return interaction.reply({
      content:
        "⚠️ I don’t have permission to post in that channel.\n" +
        "Give me **View Channel** + **Send Messages**, then try again.",
      ephemeral: true,
    });
  }

  await dbSetDeployChannel(interaction.guildId, ch.id);
  return interaction.reply({
    content: `✅ Deployment updates channel set to <#${ch.id}>`,
    ephemeral: true,
  });
}

    if (interaction.commandName === "show_deploy_channel") {
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: "This command can only be used in a server.",
          ephemeral: true,
        });
      }
      if (!isOwner(interaction)) {
        return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
      }

      const saved = await dbGetDeployChannel(interaction.guildId);
      return interaction.reply({
        content: saved
          ? `📌 Deployment updates channel: <#${saved}>`
          : "📌 No deployment updates channel set.",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "reset_deploy_channel") {
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: "This command can only be used in a server.",
          ephemeral: true,
        });
      }
      if (!isOwner(interaction)) {
        return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
      }

      await dbResetDeployChannel(interaction.guildId);
      return interaction.reply({
        content: "✅ Deployment updates channel reset.",
        ephemeral: true,
      });
    }


// TODO COMMANDS (server-only)
if (interaction.commandName === "todo_add") {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }
  if (!canManageTodos(interaction)) {
    return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
  }
  const text = interaction.options.getString("text", true).trim();
  if (!text) return interaction.reply({ content: "❌ TODO text is required.", ephemeral: true });

  const id = await dbAddTodo(interaction.guildId, text, interaction.user.id);
  if (!id) return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });

  return interaction.reply({ content: `✅ Added TODO **#${id}** — ${text}`, ephemeral: false });
}

if (interaction.commandName === "todo_list") {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }
  if (!canManageTodos(interaction)) {
    return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
  }

  const includeDone = interaction.options.getBoolean("all") ?? false;
  const items = await dbListTodos(interaction.guildId, includeDone, 20);

  if (!items.length) return interaction.reply({ content: "📭 No TODOs yet.", ephemeral: false });

  const lines = items.map(i => `${i.is_done ? "✅" : "🟨"} **#${i.id}** — ${i.text}`);
  return interaction.reply({ content: `📝 **TODOs**\n${lines.join("\n")}`, ephemeral: false });
}

if (interaction.commandName === "todo_done") {
  if (!interaction.inGuild()) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }
  if (!canManageTodos(interaction)) {
    return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
  }

  const id = interaction.options.getInteger("id", true);
  const ok = await dbDoneTodo(interaction.guildId, id);

  return interaction.reply({ content: ok ? `✅ Marked TODO **#${id}** as done.` : `❌ TODO **#${id}** not found.`, ephemeral: false });
}



    if (interaction.commandName === "help") {
  const isGuild = interaction.inGuild();
  const owner = isOwner(interaction);

  const embed = new EmbedBuilder()
    .setTitle("Bot Commands")
    .setDescription("Here’s everything you can use:")
    .addFields(
      {
        name: "Fun / Social",
        value: [
          "• `/compliment [user]` — send a random compliment",
          "• `/roast [user]` — roast someone",
          "• `/mimic <text>` — SpOnGeBoB cAsE",
          "• `/cat` — random chaotic cat",
          "• `/crazy [times]` — the crazy copypasta (1–3)",
        ].join("\n"),
        inline: false,
      },
      {
        name: "Status",
        value: [
          "• `/status` — uptime + who made the bot",
          "• `/ping` — bot latency",
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({ text: `Made by ${ownerDisplay}` })
  if (isGuild && owner) {
    embed.addFields({
      name: "Deploy Updates (Owner Only)",
      value: [
        "• `/set_deploy_channel #channel` — set deploy updates channel",
        "• `/show_deploy_channel` — show current deploy channel",
        "• `/reset_deploy_channel` — reset deploy channel",
      ].join("\n"),
      inline: false,
    },
    {
      name: "TODO commands (Owner/User with manage server perm Only)",
      value: [
        "• `/todo_add #text` — adds a TODO text",
        "• `/todo_list [id]` — shows TODO list",
        "• `/todo_done <id>` — sets a TODO as done",
      ].join("\n"),
      inline: false,
    });
  } else if (isGuild && !owner) {
    embed.addFields({
      name: "Deploy Updates",
      value: "Owner-only commands are available in this server.",
      inline: false,
    });
  }

  return interaction.reply({ embeds: [embed], ephemeral: false });
    }
    
    // /status
    if (interaction.commandName === "status") {
      const startedAt = Math.floor((Date.now() - process.uptime() * 1000) / 1000);
      const msg = [
        `**Uptime:** <t:${startedAt}:R>`,
        `**Made by:** ${ownerDisplay}`,
      ].join("\n");
      return interaction.reply({ content: msg, ephemeral: false });
    }

    // /ping
    if (interaction.commandName === "ping") {
      return interaction.reply({
        content: `**Ping:** ${client.ws.ping}ms`,
        ephemeral: false,
      });
    }

    // /cat
    if (interaction.commandName === "cat") {
      await interaction.deferReply();
      try {
        const response = await fetch("https://api.thecatapi.com/v1/images/search");
        const data = await response.json();
        const catUrl = data?.[0]?.url;

        if (!catUrl) return interaction.editReply("😿 No cats found today...");

        return interaction.editReply({
          content: "🐱 Here is a chaotic cat!",
          files: [catUrl],
        });
      } catch (e) {
        console.error("Cat API error:", e);
        return interaction.editReply("😿 The cats are hiding.");
      }
    }

    // /mimic
    if (interaction.commandName === "mimic") {
      const text = interaction.options.getString("text", true);
      return interaction.reply({ content: toSpongeCase(text), ephemeral: false });
    }

    // /roast
    if (interaction.commandName === "roast") {
      const target = interaction.options.getUser("user") || interaction.user;
      return interaction.reply({
        content: `<@${target.id}>, ${pickRandom(roasts)}`,
        ephemeral: false,
      });
    }

    // /compliment
    if (interaction.commandName === "compliment") {
      const now = Date.now();
      const prev = complimentCooldown.get(interaction.user.id) ?? 0;
      if (now - prev < COMPLIMENT_COOLDOWN_MS) {
        return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
      }
      complimentCooldown.set(interaction.user.id, now);

      const fromFile = loadCompliments();
      const fallback = [
        "You’ve got really good vibes.",
        "You’re doing better than you think.",
        "You make things feel easier for people.",
      ];
      const pool = fromFile.length ? fromFile : fallback;

      const target = interaction.options.getUser("user");

      // In DMs: compliment invoker only
      if (!interaction.inGuild()) {
        return interaction.reply({ content: `✨ ${pickRandom(pool)}`, ephemeral: false });
      }

      const who = target ?? interaction.user;
      return interaction.reply({
        content: `Hey <@${who.id}> — ${pickRandom(pool)} ✨`,
        ephemeral: false,
      });
    }

    // /crazy (works in DMs)
    if (interaction.commandName === "crazy") {
      const now = Date.now();
      const prev = crazyCooldown.get(interaction.user.id) ?? 0;
      if (now - prev < CRAZY_COOLDOWN_MS) {
        return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
      }
      crazyCooldown.set(interaction.user.id, now);

      const timesRaw = interaction.options.getInteger("times") ?? 1;
      const times = Math.max(1, Math.min(timesRaw, CRAZY_MAX_TIMES));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`crazy_send_${times}_${interaction.user.id}`)
          .setLabel("Go Crazy")
          .setStyle(ButtonStyle.Danger)
      );

      const payload = {
        content: `Ready to go crazy? Times: **${times}** (max ${CRAZY_MAX_TIMES}).`,
        components: [row],
      };

      // Ephemeral breaks in DMs -> only use in guilds
      if (interaction.inGuild()) payload.ephemeral = true;

      return interaction.reply(payload);
    }
  }

  // -------- Buttons (/crazy) --------
  if (interaction.isButton()) {
    const parts = interaction.customId.split("_");
    if (parts[0] !== "crazy") return;

    const times = Math.max(1, Math.min(parseInt(parts[2], 10) || 1, CRAZY_MAX_TIMES));
    const ownerId = parts[3];

    if (interaction.user.id !== ownerId) {
      const deny = { content: "Not your buttons 🙂" };
      if (interaction.inGuild()) deny.ephemeral = true;
      return interaction.reply(deny);
    }

    const lines = getCrazyPack();

    const ack = { content: `Sending crazy x${times} (limited).` };
    if (interaction.inGuild()) ack.ephemeral = true;
    await interaction.reply(ack);

    const outChannel = interaction.channel ?? (await interaction.user.createDM());

    let sent = 0;
    for (let t = 0; t < times; t++) {
      for (const line of lines) {
        if (sent >= CRAZY_MAX_TOTAL_LINES) return;
        await outChannel.send(line).catch(() => null);
        sent++;
      }
    }
  }
});

// =======================
// READY
// =======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await initDb();
  await notifyOnDeploy();
});

client.login(process.env.BOT_TOKEN);
