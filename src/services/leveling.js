const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { createLevelCardBuffer } = require("../utils/levelCard");
const { pool } = require("../db/pool");
const { incrementMessages, addXpStats, getUserStats } = require("./userStats");
const { checkAchievementUnlocks } = require("./achievements");
const { getCardBackground } = require("./config");

const LEVEL_ROLE_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

function xpNeededForNextLevel(level) {
  const safeLevel = Math.max(0, Number(level) || 0);
  return Math.floor(50 + safeLevel * 50 + safeLevel * safeLevel * 3.3);
}

function progressForLevel(totalXp, level) {
  let remaining = Math.max(0, Number(totalXp) || 0);
  for (let l = 0; l < level; l += 1) remaining -= xpNeededForNextLevel(l);
  const needed = xpNeededForNextLevel(level);
  const current = Math.max(0, Math.min(remaining, needed));
  return { current, needed, percent: needed > 0 ? Math.floor((current / needed) * 100) : 0 };
}

function levelFromTotalXp(totalXp) {
  let level = 0;
  let remaining = Math.max(0, Number(totalXp) || 0);
  while (remaining >= xpNeededForNextLevel(level) && level < 1000) {
    remaining -= xpNeededForNextLevel(level);
    level += 1;
  }
  return level;
}

function progressBar(current, needed, size = 12) {
  const ratio = needed > 0 ? Math.max(0, Math.min(1, current / needed)) : 0;
  const filled = Math.max(0, Math.min(size, Math.round(ratio * size)));
  return "█".repeat(filled) + "░".repeat(size - filled);
}

async function ensureLevelTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      xp_min INT NOT NULL DEFAULT 15,
      xp_max INT NOT NULL DEFAULT 25,
      cooldown_seconds INT NOT NULL DEFAULT 60,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_xp BIGINT NOT NULL DEFAULT 0,
      level INT NOT NULL DEFAULT 0,
      last_xp_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_role_rewards (
      guild_id TEXT NOT NULL,
      level INT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, level)
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS user_levels_guild_level_idx ON user_levels (guild_id, level DESC, total_xp DESC);`);
}

async function upsertLevelChannel(guildId, channelId) {
  await ensureLevelTables();
  await pool.query(
    `INSERT INTO level_settings (guild_id, channel_id, enabled, updated_at)
     VALUES ($1, $2, TRUE, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

async function getLevelSettings(guildId) {
  await ensureLevelTables();
  const res = await pool.query(`SELECT * FROM level_settings WHERE guild_id=$1`, [guildId]);
  if (res.rows[0]) return res.rows[0];
  return { guild_id: guildId, channel_id: null, enabled: true, xp_min: 15, xp_max: 25, cooldown_seconds: 60 };
}

async function updateLevelSettings(guildId, settings = {}) {
  await ensureLevelTables();

  const current = await getLevelSettings(guildId);
  const enabled = typeof settings.enabled === "boolean" ? settings.enabled : current.enabled !== false;
  const channelId = settings.channelId === "" || settings.channelId === null
    ? null
    : (settings.channelId !== undefined ? String(settings.channelId).trim() : current.channel_id);

  const xpPerMessageRaw = settings.xpPerMessage ?? settings.xp_min ?? current.xp_min ?? 15;
  const xpPerMessage = Math.max(1, Math.min(500, Math.floor(Number(xpPerMessageRaw) || 15)));

  const cooldownRaw = settings.cooldownSeconds ?? settings.cooldown_seconds ?? current.cooldown_seconds ?? 60;
  const cooldownSeconds = Math.max(5, Math.min(3600, Math.floor(Number(cooldownRaw) || 60)));

  if (channelId && !/^\d{15,25}$/.test(channelId)) {
    const err = new Error("Invalid level-up channel ID.");
    err.statusCode = 400;
    throw err;
  }

  const res = await pool.query(
    `INSERT INTO level_settings (guild_id, channel_id, enabled, xp_min, xp_max, cooldown_seconds, updated_at)
     VALUES ($1, $2, $3, $4, $4, $5, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       channel_id=EXCLUDED.channel_id,
       enabled=EXCLUDED.enabled,
       xp_min=EXCLUDED.xp_min,
       xp_max=EXCLUDED.xp_max,
       cooldown_seconds=EXCLUDED.cooldown_seconds,
       updated_at=NOW()
     RETURNING *`,
    [guildId, channelId, enabled, xpPerMessage, cooldownSeconds]
  );

  return res.rows[0] || await getLevelSettings(guildId);
}

async function ensureLevelRewardRoles(guild) {
  await ensureLevelTables();
  const me = guild.members.me;
  if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return [];

  const createdOrFound = [];
  for (const level of LEVEL_ROLE_STEPS) {
    const existingDb = await pool.query(
      `SELECT role_id FROM level_role_rewards WHERE guild_id=$1 AND level=$2`,
      [guild.id, level]
    );
    let role = existingDb.rows[0]?.role_id ? guild.roles.cache.get(existingDb.rows[0].role_id) : null;

    if (!role) {
      const name = `Level ${level}`;
      role = guild.roles.cache.find((r) => r.name.toLowerCase() === name.toLowerCase());
    }

    if (!role) {
      role = await guild.roles.create({
        name: `Level ${level}`,
        reason: "Level reward role created by setup_channels",
      });
    }

    await pool.query(
      `INSERT INTO level_role_rewards (guild_id, level, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (guild_id, level) DO UPDATE SET role_id=EXCLUDED.role_id`,
      [guild.id, level, role.id]
    );
    createdOrFound.push({ level, role });
  }
  return createdOrFound;
}

async function assignLevelRoles(member, level) {
  const rewards = await pool.query(
    `SELECT level, role_id FROM level_role_rewards WHERE guild_id=$1 AND level <= $2 ORDER BY level ASC`,
    [member.guild.id, level]
  );
  const added = [];
  for (const row of rewards.rows) {
    const role = member.guild.roles.cache.get(row.role_id);
    if (!role || member.roles.cache.has(role.id)) continue;
    try {
      await member.roles.add(role, `Reached level ${row.level}`);
      added.push(role);
    } catch {}
  }
  return added;
}

function getMemberEmbedColor(member) {
  const color = member?.displayColor || 0;
  return color && color !== 0 ? color : 0x5865f2;
}

function formatCompactLevel(level) {
  return String(Math.max(0, Number(level) || 0)).padStart(2, "0");
}

function buildLevelUpEmbed({ member, oldLevel, newLevel, totalXp, addedRoles, simulated = false }) {
  const progress = progressForLevel(totalXp, newLevel);
  const xpLeft = Math.max(0, progress.needed - progress.current);
  const roleText = addedRoles?.length ? addedRoles.map((r) => `${r}`).join(" ") : "No role reward for this level";

  return new EmbedBuilder()
    .setColor(getMemberEmbedColor(member))
    .setAuthor({
      name: simulated ? "Level-up preview" : "Level up!",
      iconURL: member.user.displayAvatarURL({ size: 64 }),
    })
    .setDescription(`${member} levelled up to **lvl ${newLevel}**${simulated ? " *(simulation)*" : ""}.`)
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: "Level", value: `**${oldLevel}** → **${newLevel}**`, inline: true },
      { name: "Total XP", value: `${Number(totalXp).toLocaleString()} XP`, inline: true },
      { name: "Next level", value: `${progress.current}/${progress.needed} XP (${progress.percent}%)`, inline: true },
      { name: "Progress", value: `${progressBar(progress.current, progress.needed, 14)}\n**${xpLeft.toLocaleString()} XP** left until lvl ${newLevel + 1}`, inline: false },
      { name: "Reward", value: roleText, inline: false }
    )
    .setFooter({ text: "Keep chatting to earn XP" })
    .setTimestamp();
}

async function getUserRank(guildId, userId) {
  await ensureLevelTables();
  const res = await pool.query(
    `SELECT rank FROM (
       SELECT user_id, RANK() OVER (ORDER BY level DESC, total_xp DESC) AS rank
       FROM user_levels
       WHERE guild_id=$1
     ) ranked WHERE user_id=$2`,
    [guildId, userId]
  );
  return Number(res.rows[0]?.rank || 0);
}

function buildLevelEmbed({ user, member, levelData, rank }) {
  const level = Number(levelData.level || 0);
  const totalXp = Number(levelData.total_xp || 0);
  const progress = levelData.progress || progressForLevel(totalXp, level);
  const xpLeft = Math.max(0, progress.needed - progress.current);

  return new EmbedBuilder()
    .setColor(getMemberEmbedColor(member))
    .setAuthor({ name: `${user.username}'s level`, iconURL: user.displayAvatarURL({ size: 64 }) })
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setDescription([
      `**#${rank || "—"}** rank · **${formatCompactLevel(level)}** level`,
      "",
      `**${progress.current}/${progress.needed} XP** (${progress.percent}%)`,
      progressBar(progress.current, progress.needed, 16),
      `Total: **${totalXp.toLocaleString()} XP**`,
      `Next level in: **${xpLeft.toLocaleString()} XP**`,
    ].join("\n"))
    .setFooter({ text: "XP is earned by chatting, with a cooldown to prevent spam" })
    .setTimestamp();
}

async function handleLevelMessage(client, message) {
  if (!message.guild || message.author.bot) return;
  if (!message.content || message.content.trim().length < 2) return;

  await incrementMessages(message.guild.id, message.author.id).catch(() => {});
  await ensureLevelTables();
  const settings = await getLevelSettings(message.guild.id);
  if (settings.enabled === false) return;

  const min = Math.max(1, Number(settings.xp_min) || 15);
  const max = Math.max(min, Number(settings.xp_max) || 25);
  const cooldownSeconds = Math.max(10, Number(settings.cooldown_seconds) || 60);
  const gained = Math.floor(Math.random() * (max - min + 1)) + min;

  const current = await pool.query(
    `SELECT total_xp, level, last_xp_at FROM user_levels WHERE guild_id=$1 AND user_id=$2`,
    [message.guild.id, message.author.id]
  );
  const row = current.rows[0];

  if (row?.last_xp_at) {
    const last = new Date(row.last_xp_at).getTime();
    if (Date.now() - last < cooldownSeconds * 1000) return;
  }

  const oldTotal = Number(row?.total_xp || 0);
  const oldLevel = Number(row?.level || 0);
  const newTotal = oldTotal + gained;
  const newLevel = levelFromTotalXp(newTotal);

  await pool.query(
    `INSERT INTO user_levels (guild_id, user_id, total_xp, level, last_xp_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE
     SET total_xp=EXCLUDED.total_xp, level=EXCLUDED.level, last_xp_at=NOW(), updated_at=NOW()`,
    [message.guild.id, message.author.id, newTotal, newLevel]
  );

  await addXpStats(message.guild.id, message.author.id, gained, Math.max(0, newLevel - oldLevel)).catch(() => {});

  const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;

  const channel = settings.channel_id
    ? await client.channels.fetch(settings.channel_id).catch(() => null)
    : message.channel;

  if (newLevel <= oldLevel) {
    const stats = await getUserStats(message.guild.id, message.author.id).catch(() => ({}));
    await checkAchievementUnlocks({ guild: message.guild, member, level: newLevel, stats, channel }).catch(() => {});
    return;
  }

  const addedRoles = await assignLevelRoles(member, newLevel).catch(() => []);
  const embed = buildLevelUpEmbed({ member, oldLevel, newLevel, totalXp: newTotal, addedRoles });

  if (channel?.isTextBased()) {
    try {
      const progress = progressForLevel(newTotal, newLevel);
      const rank = await getUserRank(message.guild.id, message.author.id);
      const image = await createLevelCardBuffer({
        username: message.author.username,
        displayName: member.displayName || message.author.username,
        discriminator: message.author.discriminator,
        avatarUrl: message.author.displayAvatarURL({ extension: "png", size: 256 }),
        rank,
        level: newLevel,
        previousLevel: oldLevel,
        currentXp: progress.current,
        neededXp: progress.needed,
        totalXp: newTotal,
        accentColor: getMemberEmbedColor(member),
        backgroundUrl: await getCardBackground(message.guild.id, "level"),
        title: `Level up! ${oldLevel} → ${newLevel}`,
      });
      const attachment = new AttachmentBuilder(image, { name: "level-up.png" });
      await channel.send({ content: `${member} levelled up to **lvl ${newLevel}**!`, files: [attachment] }).catch(() => {});
      const stats = await getUserStats(message.guild.id, message.author.id).catch(() => ({}));
      await checkAchievementUnlocks({ guild: message.guild, member, level: newLevel, stats, channel }).catch(() => {});
    } catch (err) {
      console.error("Failed to build level-up card:", err);
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

async function getUserLevel(guildId, userId) {
  await ensureLevelTables();
  const res = await pool.query(`SELECT * FROM user_levels WHERE guild_id=$1 AND user_id=$2`, [guildId, userId]);
  const row = res.rows[0] || { guild_id: guildId, user_id: userId, total_xp: 0, level: 0 };
  const progress = progressForLevel(Number(row.total_xp || 0), Number(row.level || 0));
  return { ...row, progress };
}

async function getLeaderboard(guildId, limit = 10) {
  await ensureLevelTables();
  const res = await pool.query(
    `SELECT user_id, total_xp, level FROM user_levels WHERE guild_id=$1 ORDER BY level DESC, total_xp DESC LIMIT $2`,
    [guildId, limit]
  );
  return res.rows;
}

module.exports = {
  LEVEL_ROLE_STEPS,
  xpNeededForNextLevel,
  progressForLevel,
  progressBar,
  levelFromTotalXp,
  ensureLevelTables,
  upsertLevelChannel,
  getLevelSettings,
  updateLevelSettings,
  ensureLevelRewardRoles,
  handleLevelMessage,
  getUserLevel,
  getUserRank,
  getLeaderboard,
  buildLevelEmbed,
  buildLevelUpEmbed,
  getMemberEmbedColor,
};
