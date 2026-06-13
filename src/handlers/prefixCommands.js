const { PermissionsBitField } = require("discord.js");
const { canRunCommand } = require("../services/commandPerms");
const { checkCooldown } = require("../services/cooldowns");
const { getMaintenanceEnabled } = require("../services/maintenance");
const { logCommandUsage } = require("../services/usageLogger");

const PREFIX_COMMANDS = new Set([
  "help",
  "level",
  "profile",
  "stats",
  "achievements",
  "leaderboard",
  "set_welcome_channel",
  "set_goodbye_channel",
  "set_level_channel",
  "set_prefix",
]);

function parseToken(content, prefix) {
  const body = content.slice(prefix.length).trim();
  const [rawName, ...args] = body.split(/\s+/).filter(Boolean);
  const name = String(rawName || "").toLowerCase();
  return { name, args };
}

function firstUser(message) {
  return message.mentions.users.first() || null;
}

function firstChannel(message) {
  return message.mentions.channels.first() || null;
}

function makePrefixInteraction(message, commandName, args) {
  let deferred = false;
  let replied = false;
  let lastReply = null;

  const replyTarget = async (payload) => {
    replied = true;
    lastReply = await message.reply(payload).catch(() => null);
    return lastReply;
  };

  const editTarget = async (payload) => {
    if (lastReply?.edit) return lastReply.edit(payload).catch(() => null);
    return message.reply(payload).catch(() => null);
  };

  const options = {
    getUser(name) {
      if (name !== "user") return null;
      return firstUser(message) || message.author;
    },
    getChannel(name, required = false) {
      if (name !== "channel") return null;
      const channel = firstChannel(message);
      if (!channel && required) throw new Error("Mention a channel, for example `#welcome`.");
      return channel;
    },
    getString(name) {
      if (name === "prefix") return args[0] || null;
      return args.join(" ") || null;
    },
  };

  return {
    isPrefix: true,
    commandName,
    client: message.client,
    guild: message.guild,
    guildId: message.guildId,
    channel: message.channel,
    channelId: message.channelId,
    user: message.author,
    member: message.member,
    memberPermissions: message.member?.permissions || new PermissionsBitField(0n),
    options,
    get deferred() { return deferred; },
    get replied() { return replied; },
    isRepliable: () => true,
    reply: replyTarget,
    deferReply: async () => { deferred = true; return null; },
    editReply: editTarget,
    followUp: replyTarget,
  };
}

async function handlePrefixCommand(client, message, prefix) {
  if (!message.guild || message.author.bot) return false;
  if (!message.content.startsWith(prefix)) return false;

  const { name, args } = parseToken(message.content, prefix);
  if (!name) return false;
  if (!PREFIX_COMMANDS.has(name)) return false;

  const cmd = client.commands.get(name);
  if (!cmd) return false;

  const interaction = makePrefixInteraction(message, name, args);

  const maintenanceEnabled = await getMaintenanceEnabled();
  const isOwner = message.author.id === process.env.OWNER_ID;
  if (maintenanceEnabled && !isOwner && name !== "maintenance") {
    await message.reply("Bot temporarily disabled: maintenance mode.").catch(() => {});
    return true;
  }

  const allowed = await canRunCommand(interaction, name);
  if (!allowed) {
    await message.reply("Error: You don’t have permission to use this command here.").catch(() => {});
    return true;
  }

  if (!isOwner) {
    const noCooldown = new Set(["help", "ping", "maintenance", "panel"]);
    if (!noCooldown.has(name)) {
      const cd = checkCooldown({ userId: message.author.id, commandName: name });
      if (!cd.ok) {
        await message.reply(`Error: Command on cooldown. Try again in ${Math.ceil(cd.remainingMs / 1000)}s.`).catch(() => {});
        return true;
      }
    }
  }

  const started = Date.now();
  try {
    await cmd.execute(interaction, client);
    logCommandUsage({ guildId: message.guildId, userId: message.author.id, commandName: name, ok: true, durationMs: Date.now() - started });
  } catch (err) {
    logCommandUsage({ guildId: message.guildId, userId: message.author.id, commandName: name, ok: false, error: err?.message || String(err), durationMs: Date.now() - started });
    await message.reply(`Error: ${err?.message || String(err)}`).catch(() => {});
  }

  return true;
}

module.exports = { handlePrefixCommand, PREFIX_COMMANDS };
