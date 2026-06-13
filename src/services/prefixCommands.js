const { PermissionsBitField } = require("discord.js");
const { getGuildPrefix, setGuildPrefix } = require("./prefixSettings");

const PREFIX_SUPPORTED = new Map([
  ["help", { command: "help", dm: true, usage: "help" }],
  ["ping", { command: "ping", dm: true, usage: "ping" }],
  ["cat", { command: "cat", dm: true, usage: "cat" }],
  ["mimic", { command: "mimic", dm: true, usage: "mimic <text>", strings: ["text"] }],
  ["crazy", { command: "crazy", dm: true, usage: "crazy" }],
  ["compliment", { command: "compliment", dm: true, usage: "compliment [@user]", userOption: "user", defaultUser: true }],
  ["roast", { command: "roast", dm: true, usage: "roast [@user]", userOption: "user", defaultUser: true }],
  ["8ball", { command: "8ball", dm: true, usage: "8ball <question>", strings: ["question"] }],
  ["would_you_rather", { command: "would_you_rather", dm: true, usage: "would_you_rather" }],
  ["wyr", { command: "would_you_rather", dm: true, usage: "wyr" }],
  ["fact", { command: "fact", dm: true, usage: "fact" }],
  ["trivia", { command: "trivia", dm: true, usage: "trivia" }],
  ["summarize", { command: "summarize", dm: true, usage: "summarize <text>", strings: ["text"] }],
  ["improve", { command: "improve", dm: true, usage: "improve <text>", strings: ["text"], optionalStrings: { tone: "natural" } }],
  ["explain", { command: "explain", dm: true, usage: "explain <text>", strings: ["text"] }],
  ["translate", { command: "translate", dm: true, usage: "translate <language> <text>", custom: "translate" }],
  ["level", { command: "level", dm: false, usage: "level [@user]", userOption: "user" }],
  ["leaderboard", { command: "leaderboard", dm: false, usage: "leaderboard" }],
  ["quote", { command: "quote", dm: false, usage: "quote random | quote list | quote save <text>", custom: "quote" }],
  ["suggest", { command: "suggest", dm: false, usage: "suggest <text>", custom: "suggest" }],
  ["poll", { command: "poll", dm: false, usage: "poll question | option 1 | option 2 | option 3", custom: "poll" }],
  ["set_level_channel", { command: "set_level_channel", dm: false, admin: true, usage: "set_level_channel #channel", channelOption: "channel" }],
  ["set_prefix", { command: "set_prefix", dm: false, admin: true, usage: "set_prefix <prefix>", custom: "set_prefix" }],
]);

function prefixHelpLines(prefix) {
  return Array.from(PREFIX_SUPPORTED.values())
    .map((info) => `\`${prefix}${info.usage}\``)
    .join("\n");
}

function tokenize(input) {
  return String(input || "").match(/"[^"]+"|'[^']+'|\S+/g)?.map((x) => {
    if ((x.startsWith('"') && x.endsWith('"')) || (x.startsWith("'") && x.endsWith("'"))) return x.slice(1, -1);
    return x;
  }) || [];
}

function getMentionId(value, type) {
  if (!value) return null;
  const raw = String(value).trim();
  if (type === "channel") {
    const m = raw.match(/^<#(\d+)>$/) || raw.match(/^(\d{15,25})$/);
    return m?.[1] || null;
  }
  const m = raw.match(/^<@!?(\d+)>$/) || raw.match(/^(\d{15,25})$/);
  return m?.[1] || null;
}

async function resolveUser(message, value, fallbackSelf = false) {
  const id = getMentionId(value, "user");
  if (id) {
    return message.client.users.fetch(id).catch(() => null);
  }
  return fallbackSelf ? message.author : null;
}

async function resolveChannel(message, value) {
  const id = getMentionId(value, "channel");
  if (!id) return null;
  return message.client.channels.fetch(id).catch(() => null);
}

function makeOptions(values) {
  return {
    getString(name, required = false) {
      const v = values[name];
      if ((v === undefined || v === null || v === "") && required) throw new Error(`Missing option ${name}`);
      return v ?? null;
    },
    getUser(name, required = false) {
      const v = values[name];
      if (!v && required) throw new Error(`Missing option ${name}`);
      return v || null;
    },
    getChannel(name, required = false) {
      const v = values[name];
      if (!v && required) throw new Error(`Missing option ${name}`);
      return v || null;
    },
    getInteger(name, required = false) {
      const v = values[name];
      if ((v === undefined || v === null || Number.isNaN(Number(v))) && required) throw new Error(`Missing option ${name}`);
      return v === undefined || v === null ? null : Number(v);
    },
    getSubcommand() {
      return values.__subcommand || null;
    },
    getFocused() {
      return null;
    },
  };
}

function cleanReplyPayload(payload) {
  if (typeof payload === "string") return { content: payload };
  if (!payload || typeof payload !== "object") return { content: String(payload ?? "") };
  const copy = { ...payload };
  delete copy.ephemeral;
  delete copy.fetchReply;
  return copy;
}

function makePrefixInteraction(message, commandName, values) {
  let lastReply = null;
  const memberPermissions = message.member?.permissions || new PermissionsBitField(0n);
  return {
    client: message.client,
    commandName,
    guild: message.guild || null,
    guildId: message.guildId || null,
    channel: message.channel,
    channelId: message.channelId,
    user: message.author,
    member: message.member || null,
    memberPermissions,
    createdTimestamp: message.createdTimestamp,
    options: makeOptions(values),
    deferred: false,
    replied: false,
    isRepliable: () => true,
    isChatInputCommand: () => false,
    async deferReply() {
      this.deferred = true;
    },
    async reply(payload) {
      this.replied = true;
      lastReply = await message.channel.send(cleanReplyPayload(payload));
      return lastReply;
    },
    async editReply(payload) {
      const clean = cleanReplyPayload(payload);
      if (lastReply?.editable) {
        await lastReply.edit(clean).catch(async () => { lastReply = await message.channel.send(clean); });
      } else {
        lastReply = await message.channel.send(clean);
      }
      this.replied = true;
      return lastReply;
    },
    async followUp(payload) {
      return message.channel.send(cleanReplyPayload(payload));
    },
  };
}

async function buildValues(message, info, args, rest) {
  const values = {};

  if (info.custom === "translate") {
    values.to = args.shift() || "English";
    values.text = args.join(" ").trim();
    return values;
  }

  if (info.custom === "quote") {
    const sub = (args.shift() || "random").toLowerCase();
    values.__subcommand = sub === "save" || sub === "list" || sub === "remove" ? sub : "random";
    if (values.__subcommand === "save") values.text = args.join(" ").trim();
    if (values.__subcommand === "remove") values.id = Number(args[0]);
    return values;
  }

  if (info.custom === "suggest") {
    values.__subcommand = "add";
    values.text = rest.trim();
    return values;
  }

  if (info.custom === "poll") {
    const parts = rest.split("|").map((p) => p.trim()).filter(Boolean);
    values.question = parts[0] || "Poll";
    values.option1 = parts[1] || "Yes";
    values.option2 = parts[2] || "No";
    for (let i = 3; i <= 5; i += 1) if (parts[i]) values[`option${i}`] = parts[i];
    return values;
  }

  if (info.custom === "set_prefix") {
    values.prefix = args[0] || ".";
    return values;
  }

  if (info.userOption) {
    values[info.userOption] = await resolveUser(message, args[0], Boolean(info.defaultUser));
  }

  if (info.channelOption) {
    values[info.channelOption] = await resolveChannel(message, args[0]);
  }

  if (Array.isArray(info.strings) && info.strings.length) {
    values[info.strings[0]] = rest.trim();
  }

  if (info.optionalStrings) {
    for (const [key, val] of Object.entries(info.optionalStrings)) values[key] = val;
  }

  return values;
}

async function handlePrefixMessage(client, message) {
  if (!message || message.author?.bot) return false;

  const prefix = message.guildId ? await getGuildPrefix(message.guildId) : ".";
  if (!message.content?.startsWith(prefix)) return false;

  const body = message.content.slice(prefix.length).trim();
  if (!body) return false;

  const args = tokenize(body);
  const typedName = String(args.shift() || "").toLowerCase();
  const rest = body.slice(typedName.length).trim();
  const info = PREFIX_SUPPORTED.get(typedName);
  if (!info) return false;

  if (!message.guildId && !info.dm) {
    await message.channel.send("This prefix command can only be used in a server.");
    return true;
  }

  if (info.admin && message.guildId) {
    const canManage = message.author.id === process.env.OWNER_ID || message.member?.permissions?.has("ManageGuild");
    if (!canManage) {
      await message.channel.send("Requires Manage Server or Owner.");
      return true;
    }
  }

  if (info.custom === "set_prefix") {
    if (!message.guildId) {
      await message.channel.send("Server only.");
      return true;
    }
    const canManage = message.author.id === process.env.OWNER_ID || message.member?.permissions?.has("ManageGuild");
    if (!canManage) {
      await message.channel.send("Requires Manage Server or Owner.");
      return true;
    }
    const next = args[0] || ".";
    const saved = await setGuildPrefix(message.guildId, next);
    await message.channel.send(`Prefix set to \`${saved}\`. Example: \`${saved}help\``);
    return true;
  }

  const cmd = client.commands.get(info.command);
  if (!cmd?.execute) {
    await message.channel.send(`Command \`${info.command}\` is not available.`);
    return true;
  }

  const values = await buildValues(message, info, args, rest);
  const fakeInteraction = makePrefixInteraction(message, info.command, values);
  try {
    await cmd.execute(fakeInteraction, client);
  } catch (err) {
    console.error("Prefix command error:", err);
    await message.channel.send(`Error: ${err?.message || String(err)}`).catch(() => {});
  }
  return true;
}

module.exports = { PREFIX_SUPPORTED, prefixHelpLines, handlePrefixMessage };
