const { AttachmentBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { createMemberEventCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("./config");

async function ensureWelcomeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      goodbye_channel_id TEXT,
      welcome_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      goodbye_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
  };
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

async function buildMemberEventAttachment({ member, type }) {
  const isGoodbye = type === "goodbye";
  const backgroundUrl = await getCardBackground(member.guild.id, isGoodbye ? "goodbye" : "welcome").catch(() => null);
  const image = await createMemberEventCardBuffer({
    type,
    username: member.user?.username,
    displayName: member.displayName || member.user?.username,
    avatarUrl: member.user?.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
    memberNumber: memberNumberFor(member.guild),
    guildName: member.guild?.name,
    accentColor: member.displayColor || member.guild?.members?.me?.displayColor || 0x7c3aed,
    backgroundUrl,
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

  const attachment = await buildMemberEventAttachment({ member, type });
  const content = isGoodbye
    ? `${member.user?.tag || member.user?.username || "Someone"} left the server.${simulated ? " *(simulation)*" : ""}`
    : `Welcome ${member} to **${member.guild.name}**!${simulated ? " *(simulation)*" : ""}`;

  await channel.send({ content, files: [attachment] });
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
  setWelcomeChannel,
  setGoodbyeChannel,
  resetWelcomeChannel,
  resetGoodbyeChannel,
  buildMemberEventAttachment,
  sendMemberEvent,
  handleMemberJoin,
  handleMemberLeave,
};
