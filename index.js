require("dotenv").config();
const { Client, GatewayIntentBits, Events,
  ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const express = require("express");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// =======================
// WEB SERVER (for keep-alive)
// =======================
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Bot is alive! 🤖");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =======================
// CONFIG (daily compliments)
// =======================
const TARGET_USER_ID = process.env.TARGET_USER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TZ = process.env.TZ || "Europe/Lisbon";
const DAILY_CRON = "0 9 * * *"; // 09:00 every day (Portugal time)

// =======================
// FILES (compliments from file + no-repeat state)
// =======================
const COMPLIMENTS_FILE = path.join(__dirname, "compliments.txt");
const USED_FILE = path.join(__dirname, "used.json");

// Load compliments from compliments.txt (one per line)
function loadCompliments() {
  try {
    return fs
      .readFileSync(COMPLIMENTS_FILE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    console.error("❌ Could not read compliments.txt");
    return [];
  }
}

function loadUsed() {
  try {
    return JSON.parse(fs.readFileSync(USED_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsed(list) {
  fs.writeFileSync(USED_FILE, JSON.stringify(list, null, 2));
}

function pickNoRepeat(all, used) {
  const available = all.filter((c) => !used.includes(c));
  if (available.length === 0) {
    saveUsed([]);
    return pickNoRepeat(all, []);
  }
  return available[Math.floor(Math.random() * available.length)];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =======================
// /compliment (server + DM)
// =======================
const complimentCooldown = new Map();
const COMPLIMENT_COOLDOWN_MS = 10_000;

// =======================
// /crazy (buttons + limits)
// =======================
const crazyCooldown = new Map();
const CRAZY_COOLDOWN_MS = 15_000;
const CRAZY_MAX_TIMES = 3;
const CRAZY_MAX_TOTAL_LINES = 25;

function getCrazyPack(mode) {
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

// =======================
// DAILY compliment sender (no-repeat)
// =======================
let lastSentDate = null;

async function sendDailyCompliment() {
  if (!TARGET_USER_ID || !CHANNEL_ID) return;

  const today = new Date().toISOString().slice(0, 10);
  if (lastSentDate === today) return;

  const compliments = loadCompliments();
  if (!compliments.length) return;

  const used = loadUsed();
  const chosen = pickNoRepeat(compliments, used);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  await channel.send(`💖 <@${TARGET_USER_ID}>, ${chosen}`);

  used.push(chosen);
  saveUsed(used);
  lastSentDate = today;
}

// =======================
// NEW COMMANDS: /cat, /mimic, /roast
// =======================
const roasts = [
  "I’d agree with you but then we’d both be wrong.",
  "I’m not saying I hate you, but I’d unplug your life support to charge my phone.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I treasure the time I spend with you, but I treasure my sanity more.",
  "You have the perfect face for radio.",
];

function toSpongeCase(text) {
  return text
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join("");
}

// =======================
// INTERACTIONS
// =======================
client.on(Events.InteractionCreate, async (interaction) => {
  // ------- Slash commands -------
  if (interaction.isChatInputCommand()) {
    // /help
    if (interaction.commandName === "help") {
      const helpMessage = [
        "**Available Commands:**",
        "🔹 `/help` - Shows this help message.",
        "🔹 `/status` - Shows technical details about the bot.",
        "🔹 `/crazy [times]` - Sends the 'crazy' copypasta. (times: 1-3)",
        "🔹 `/compliment [user]` - Sends a random compliment to you or a tagged user.",
        "🔹 `/cat` - Fetches a random chaotic cat image.",
        "🔹 `/mimic <text>` - Repeats your text in SpOnGeBoB cAsE.",
        "🔹 `/roast [user]` - Roasts you or a tagged user. 🔥"
      ].join("\n");
      return interaction.reply({ content: helpMessage, ephemeral: false });
    }

    // /status
    if (interaction.commandName === "status") {
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      
      const statusMessage = [
        "**Bot Status & Details:**",
        `🤖 **Tag:** ${client.user.tag}`,
        `⏱️ **Uptime:** ${hours}h ${minutes}m ${seconds}s`,
        `📡 **Ping:** ${client.ws.ping}ms`,
        `📦 **Platform:** Node.js ${process.version}`,
        "🛠️ **Built with:** discord.js v14",
        "⚙️ **Features:** Daily compliments, slash commands, cron scheduling"
      ].join("\n");
      return interaction.reply({ content: statusMessage, ephemeral: true });
    }

    // /cat
    if (interaction.commandName === "cat") {
      await interaction.deferReply();
      try {
        const response = await fetch("https://api.thecatapi.com/v1/images/search");
        const data = await response.json();
        const catUrl = data[0]?.url;
        if (catUrl) {
          return interaction.editReply({ content: "🐱 Here is a chaotic cat!", files: [catUrl] });
        }
        return interaction.editReply("😿 No cats found today...");
      } catch (error) {
        console.error("Cat API error:", error);
        return interaction.editReply("😿 The cats are hiding.");
      }
    }

    // /mimic
    if (interaction.commandName === "mimic") {
      const text = interaction.options.getString("text");
      return interaction.reply(toSpongeCase(text));
    }

    // /roast
    if (interaction.commandName === "roast") {
      const target = interaction.options.getUser("user") || interaction.user;
      const roast = roasts[Math.floor(Math.random() * roasts.length)];
      return interaction.reply(`<@${target.id}>, ${roast}`);
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

      // In DMs: compliment the invoker only
      if (!interaction.inGuild()) {
        return interaction.reply({ content: `✨ ${pickRandom(pool)}` });
      }

      const who = target ?? interaction.user;
      return interaction.reply({ content: `Hey <@${who.id}> — ${pickRandom(pool)} ✨` });
    }

    // /crazy -> show buttons
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
          .setCustomId(`crazy_crazy_${times}_${interaction.user.id}`)
          .setLabel("Go Crazy")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: `Ready to go crazy? Times: **${times}** (max ${CRAZY_MAX_TIMES}).`,
        components: [row],
        ephemeral: true,
      });
    }
  }

  // ------- Buttons for /crazy -------
  if (interaction.isButton()) {
    const [tag, modeKey, timesStr, ownerId] = interaction.customId.split("_");
    if (tag !== "crazy") return;

    // only the original user can use these buttons
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Not your buttons 🙂", ephemeral: true });
    }

    const mode = "crazy";
    const times = Math.max(1, Math.min(parseInt(timesStr, 10) || 1, CRAZY_MAX_TIMES));
    const lines = getCrazyPack(mode);

    await interaction.reply({ content: `Sending **${mode}** x${times} (limited).`, ephemeral: true });

    let sent = 0;
    for (let t = 0; t < times; t++) {
      for (const line of lines) {
        if (sent >= CRAZY_MAX_TOTAL_LINES) return;
        await interaction.channel?.send(line).catch(() => null);
        sent++;
      }
    }
  }
});

// =======================
// READY + scheduler
// =======================
client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`⏰ Daily compliment scheduled for 09:00 (${TZ})`);

  cron.schedule(
    DAILY_CRON,
    () => sendDailyCompliment().catch((e) => console.error("Daily failed:", e)),
    { timezone: TZ }
  );
});

client.login(process.env.BOT_TOKEN);