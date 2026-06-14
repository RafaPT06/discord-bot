const { AttachmentBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { createAchievementCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("./config");

const ACHIEVEMENTS = [
  { id: "level_5", name: "FIRST STEPS", description: "Reached Level 5", type: "level", value: 5 },
  { id: "level_10", name: "REGULAR", description: "Reached Level 10", type: "level", value: 10 },
  { id: "level_25", name: "VETERAN", description: "Reached Level 25", type: "level", value: 25 },
  { id: "level_50", name: "ELITE", description: "Reached Level 50", type: "level", value: 50 },
  { id: "level_100", name: "LEGEND", description: "Reached Level 100", type: "level", value: 100 },
  { id: "prestige_1", name: "PRESTIGE I", description: "Reached Prestige 1", type: "prestige", value: 1 },
  { id: "messages_100", name: "CHATTY", description: "Sent 100 messages", type: "messages", value: 100 },
  { id: "commands_50", name: "BOT USER", description: "Used 50 commands", type: "commands", value: 50 },
];

function prestigeForLevel(level) {
  return Math.floor(Math.max(0, Number(level) || 0) / 100);
}

async function ensureAchievementTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievement_unlocks (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id, achievement_id)
    );
  `);
}

async function getUnlockedAchievements(guildId, userId) {
  await ensureAchievementTables();
  const res = await pool.query(
    `SELECT achievement_id, unlocked_at FROM achievement_unlocks WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return new Map(res.rows.map((r) => [r.achievement_id, r.unlocked_at]));
}

async function unlockAchievement(guildId, userId, achievementId) {
  await ensureAchievementTables();
  const res = await pool.query(
    `INSERT INTO achievement_unlocks (guild_id, user_id, achievement_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING achievement_id`,
    [guildId, userId, achievementId]
  );
  return Boolean(res.rows[0]);
}

async function checkAchievementUnlocks({ guild, member, user, level = 0, stats = {}, channel = null }) {
  if (!guild || (!member && !user)) return [];
  const targetUser = user || member.user;
  const unlocked = [];
  const prestige = prestigeForLevel(level);
  const messages = Number(stats.messages || 0);
  const commands = Number(stats.commands_used || stats.commandCount || 0);

  for (const achievement of ACHIEVEMENTS) {
    let earned = false;
    if (achievement.type === "level") earned = Number(level) >= achievement.value;
    if (achievement.type === "prestige") earned = prestige >= achievement.value;
    if (achievement.type === "messages") earned = messages >= achievement.value;
    if (achievement.type === "commands") earned = commands >= achievement.value;
    if (!earned) continue;

    const inserted = await unlockAchievement(guild.id, targetUser.id, achievement.id);
    if (!inserted) continue;
    unlocked.push(achievement);

    if (channel?.isTextBased?.()) {
      try {
        const backgroundUrl = await getCardBackground(guild.id, "achievement");
        const image = await createAchievementCardBuffer({
          username: targetUser.username,
          displayName: member?.displayName || targetUser.username,
          avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
          achievementName: achievement.name,
          description: achievement.description,
          accentColor: member?.displayColor || 0xfbbf24,
          backgroundUrl,
        });
        await channel.send({
          content: `${member || `<@${targetUser.id}>`} unlocked **${achievement.name}**!`,
          files: [new AttachmentBuilder(image, { name: "achievement.png" })],
        }).catch(() => {});
      } catch {}
    }
  }

  return unlocked;
}

module.exports = {
  ACHIEVEMENTS,
  prestigeForLevel,
  ensureAchievementTables,
  getUnlockedAchievements,
  unlockAchievement,
  checkAchievementUnlocks,
};
