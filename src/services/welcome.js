const { AttachmentBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { createMemberEventCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("./config");
const { BRAND_COLORS } = require("../utils/brandColors");

const CARD_STYLE = "Custom Card (Modern)";
const TEXT_STYLE = "Text only";

async function ensureWelcomeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      goodbye_channel_id TEXT,
      welcome_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      goodbye_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      welcome_message TEXT,
      goodbye_message TEXT,
      welcome_style TEXT NOT NULL DEFAULT '${CARD_STYLE}',
      goodbye_style TEXT NOT NULL DEFAULT '${TEXT_STYLE}',
      show_member BOOLEAN NOT NULL DEFAULT TRUE,
      show_avatar BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS welcome_message TEXT;
    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS goodbye_message TEXT;
    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS welcome_style TEXT NOT NULL DEFAULT '${CARD_STYLE}';
    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS goodbye_style TEXT NOT NULL DEFAULT '${TEXT_STYLE}';
    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS show_member BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN NOT NULL DEFAULT TRUE;
  `);
}

async function getWelcomeSettings(guildId) {
  await ensureWelcomeTables();
  const res = await pool.query(`SELECT * FROM welcome_settings WHERE guild_id=$1`, [guildId]);
  return res.rows[0] || {
    guild_id: guildId,
    welcome_channel_id: null,
    goodbye_channel_id: null,
    welcome_enabled: true,
    goodbye_enabled: true,
    welcome_message: "",
    goodbye_message: "",
    welcome_style: CARD_STYLE,
    goodbye_style: TEXT_STYLE,
    show_member: true,
    show_avatar: true,
  };
}

function normalizeChannelId(value, label = "channel ID") {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const clean = String(value).trim();
  if (!clean) return null;
  if (!/^\d{15,25}$/.test(clean)) {
    const err = new Error(`Invalid ${label}.`);
    err.statusCode = 400;
    throw err;
  }
  return clean;
}

function normalizeMessageStyle(value, fallback = CARD_STYLE) {
  const clean = String(value ?? "").trim().toLowerCase();
  if (!clean) return fallback;
  if (clean === "text only" || clean === "text") return TEXT_STYLE;
  if (clean === "custom card (modern)" || clean === "card" || clean === "custom card") return CARD_STYLE;
  const err = new Error("Invalid welcome or goodbye message style.");
  err.statusCode = 400;
  throw err;
}

async function updateWelcomeSettings(guildId, settings = {}) {
  await ensureWelcomeTables();
  const current = await getWelcomeSettings(guildId);
  const welcomeChannelId = settings.welcomeChannelId !== undefined
    ? normalizeChannelId(settings.welcomeChannelId, "welcome channel ID")
    : current.welcome_channel_id;
  const goodbyeChannelId = settings.goodbyeChannelId !== undefined
    ? normalizeChannelId(settings.goodbyeChannelId, "leave channel ID")
    : current.goodbye_channel_id;

  const welcomeEnabled = typeof settings.welcomeEnabled === "boolean" ? settings.welcomeEnabled : current.welcome_enabled !== false;
  const goodbyeEnabled = typeof settings.goodbyeEnabled === "boolean" ? settings.goodbyeEnabled : current.goodbye_enabled !== false;
  const welcomeMessage = settings.welcomeMessage !== undefined
    ? String(settings.welcomeMessage || "").trim().slice(0, 1000)
    : (current.welcome_message || "");
  const goodbyeMessage = settings.goodbyeMessage !== undefined
    ? String(settings.goodbyeMessage || "").trim().slice(0, 1000)
    : (current.goodbye_message || "");
  const welcomeStyle = settings.welcomeStyle !== undefined
    ? normalizeMessageStyle(settings.welcomeStyle, CARD_STYLE)
    : normalizeMessageStyle(current.welcome_style, CARD_STYLE);
  const goodbyeStyle = settings.goodbyeStyle !== undefined
    ? normalizeMessageStyle(settings.goodbyeStyle, TEXT_STYLE)
    : normalizeMessageStyle(current.goodbye_style, TEXT_STYLE);
  const showMember = typeof settings.showMember === "boolean" ? settings.showMember : current.show_member !== false;
  const showAvatar = typeof settings.showAvatar === "boolean" ? settings.showAvatar : current.show_avatar !== false;

  const res = await pool.query(
    `INSERT INTO welcome_settings (
       guild_id, welcome_channel_id, goodbye_channel_id, welcome_enabled, goodbye_enabled,
       welcome_message, goodbye_message, welcome_style, goodbye_style, show_member, show_avatar, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       welcome_channel_id=EXCLUDED.welcome_channel_id,
       goodbye_channel_id=EXCLUDED.goodbye_channel_id,
       welcome_enabled=EXCLUDED.welcome_enabled,
       goodbye_enabled=EXCLUDED.goodbye_enabled,
       welcome_message=EXCLUDED.welcome_message,
       goodbye_message=EXCLUDED.goodbye_message,
       welcome_style=EXCLUDED.welcome_style,
       goodbye_style=EXCLUDED.goodbye_style,
       show_member=EXCLUDED.show_member,
       show_avatar=EXCLUDED.show_avatar,
       updated_at=NOW()
     RETURNING *`,
    [guildId, welcomeChannelId, goodbyeChannelId, welcomeEnabled, goodbyeEnabled, welcomeMessage, goodbyeMessage, welcomeStyle, goodbyeStyle, showMember, showAvatar]
  );
  return res.rows[0] || getWelcomeSettings(guildId);
}

async function setWelcomeChannel(guildId, channelId) {
  await ensureWelcomeTables();
  await pool.query(
    `INSERT INTO welcome_settings (guild_id, welcome_channel_id, welcome_enabled, updated_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (guild_id) DO UPDATE
     SET welcome_channel_id=EXCLUDED.welcome_channel_id, welcome_enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

async function setGoodbyeChannel(guildId, channelId) {
  await ensureWelcomeTables();
  await pool.query(
    `INSERT INTO welcome_settings (guild_id, goodbye_channel_id, goodbye_enabled, updated_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (guild_id) DO UPDATE
     SET goodbye_channel_id=EXCLUDED.goodbye_channel_id, goodbye_enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

async function resetWelcomeChannel(guildId) {
  await ensureWelcomeTables();
  await pool.query(
    `INSERT INTO welcome_settings (guild_id, welcome_channel_id, welcome_enabled, updated_at)
     VALUES ($1, NULL, FALSE, NOW())
     ON CONFLICT (guild_id) DO UPDATE
     SET welcome_channel_id=NULL, welcome_enabled=FALSE, updated_at=NOW()`,
    [guildId]
  );
}

async function resetGoodbyeChannel(guildId) {
  await ensureWelcomeTables();
  await pool.query(
    `INSERT INTO welcome_settings (guild_id, goodbye_channel_id, goodbye_enabled, updated_at)
     VALUES ($1, NULL, FALSE, NOW())
     ON CONFLICT (guild_id) DO UPDATE
     SET goodbye_channel_id=NULL, goodbye_enabled=FALSE, updated_at=NOW()`,
    [guildId]
  );
}

function memberNumberFor(guild) {
  return guild?.memberCount || null;
}

function renderConfiguredMemberMessage(template, member, type) {
  const isGoodbye = type === "goodbye";
  const fallback = isGoodbye
    ? `${member.user?.tag || member.user?.username || "Someone"} left the server.`
    : `Welcome ${member} to **${member.guild?.name || "the server"}**!`;
  const raw = String(template || "").trim();
  if (!raw) return fallback;

  const userValue = isGoodbye
    ? (member.user?.tag || member.user?.username || `<@${member.id}>`)
    : `<@${member.id}>`;

  return raw
    .replaceAll("{user}", userValue)
    .replaceAll("{server}", String(member.guild?.name || "the server"))
    .replaceAll("{memberCount}", String(member.guild?.memberCount || ""))
    .slice(0, 1900);
}

async function buildMemberEventAttachment({ member, type, settings = null }) {
  const isGoodbye = type === "goodbye";
  const backgroundUrl = await getCardBackground(member.guild.id, isGoodbye ? "goodbye" : "welcome").catch(() => null);
  const image = await createMemberEventCardBuffer({
    type,
    username: member.user?.username,
    displayName: member.displayName || member.user?.username,
    avatarUrl: member.user?.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
    memberNumber: memberNumberFor(member.guild),
    guildName: member.guild?.name,
    accentColor: isGoodbye ? BRAND_COLORS.goodbye : BRAND_COLORS.welcome,
    backgroundUrl,
    messageTemplate: isGoodbye ? settings?.goodbye_message : settings?.welcome_message,
    showMember: settings?.show_member !== false,
    showAvatar: settings?.show_avatar !== false,
  });

  return new AttachmentBuilder(image, {
    name: isGoodbye ? "goodbye.png" : "welcome.png",
  });
}

async function sendMemberEvent(member, type, overrideChannelId = null, simulated = false) {
  if (!member?.guild) return false;
  await ensureWelcomeTables();

  const settings = await getWelcomeSettings(member.guild.id);
  const isGoodbye = type === "goodbye";
  const enabled = isGoodbye ? settings.goodbye_enabled : settings.welcome_enabled;
  const channelId = overrideChannelId || (isGoodbye ? settings.goodbye_channel_id : settings.welcome_channel_id);

  if (!enabled && !overrideChannelId) return false;
  if (!channelId) return false;

  const channel = await member.guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return false;

  const configuredMessage = renderConfiguredMemberMessage(
    isGoodbye ? settings.goodbye_message : settings.welcome_message,
    member,
    type
  );
  const content = `${configuredMessage}${simulated ? " *(simulation)*" : ""}`;
  const style = normalizeMessageStyle(
    isGoodbye ? settings.goodbye_style : settings.welcome_style,
    isGoodbye ? TEXT_STYLE : CARD_STYLE
  );
  const messagePayload = { content };

  if (style === CARD_STYLE) {
    messagePayload.files = [await buildMemberEventAttachment({ member, type, settings })];
  }

  await channel.send(messagePayload);
  return true;
}

async function handleMemberJoin(member) {
  return sendMemberEvent(member, "welcome");
}

async function handleMemberLeave(member) {
  return sendMemberEvent(member, "goodbye");
}

module.exports = {
  ensureWelcomeTables,
  getWelcomeSettings,
  updateWelcomeSettings,
  setWelcomeChannel,
  setGoodbyeChannel,
  resetWelcomeChannel,
  resetGoodbyeChannel,
  buildMemberEventAttachment,
  sendMemberEvent,
  handleMemberJoin,
  handleMemberLeave,
};
