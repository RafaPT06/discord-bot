const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { sendMemberEvent, getWelcomeSettings } = require('./welcome');
const {
  getLevelSettings,
  getUserLevel,
  getUserRank,
  xpNeededForNextLevel,
  progressForLevel,
  getMemberEmbedColor,
} = require('./leveling');
const { getLogSettings, getModerationSettings } = require('./serverSettings');
const { sendLog, sendModerationLog } = require('./dashboardEvents');
const { isUserAllowedForEditImage } = require('./editImageAccess');
const { getCardBackground } = require('./config');
const { createLevelCardBuffer } = require('../utils/levelCard');

function totalXpAtStartOfLevel(level) {
  let total = 0;
  for (let current = 0; current < level; current += 1) total += xpNeededForNextLevel(current);
  return total;
}

function botOwnerId(client) {
  const envOwner = process.env.OWNER_ID || process.env.BOT_OWNER_ID;
  if (envOwner) return String(envOwner);
  const owner = client.application?.owner;
  return String(owner?.id || owner?.user?.id || '');
}

async function resolveMember(guild, userId) {
  const requested = String(userId || '').trim();
  if (/^\d{15,25}$/.test(requested)) {
    const member = await guild.members.fetch(requested).catch(() => null);
    if (member && !member.user?.bot) return member;
  }
  const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
  if (owner && !owner.user?.bot) return owner;
  const cached = guild.members.cache.find((member) => !member.user?.bot);
  if (cached) return cached;
  throw Object.assign(new Error('No usable server member was found for this simulation.'), { statusCode: 404 });
}

async function requireTextChannel(guild, channelId, label) {
  if (!channelId) {
    throw Object.assign(new Error(`Configure a ${label} channel before running this simulation.`), { statusCode: 400 });
  }
  const channel = guild.channels.cache.get(String(channelId)) || await guild.channels.fetch(String(channelId)).catch(() => null);
  if (!channel?.isTextBased?.()) {
    throw Object.assign(new Error(`The configured ${label} channel is unavailable or is not text-based.`), { statusCode: 400 });
  }
  return channel;
}

function result(event, message, channel = null, extra = {}) {
  return {
    ok: true,
    event,
    message,
    channelId: channel?.id || null,
    channelName: channel?.name || null,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

async function removeGuildFromDashboard(client, guild, options = {}) {
  if (!process.env.BOT_API_TOKEN) {
    throw Object.assign(new Error('BOT_API_TOKEN must be configured before remote server removal can be used.'), { statusCode: 503 });
  }

  const ownerId = botOwnerId(client);
  const requestedBy = String(options.userId || '').trim();
  if (!ownerId || requestedBy !== ownerId) {
    throw Object.assign(new Error('Only the configured bot owner can remove Meowz from a server.'), { statusCode: 403 });
  }

  const guildId = guild.id;
  const guildName = guild.name;
  await guild.leave();
  return result('owner-remove-guild', `Meowz left ${guildName}.`, null, {
    guildId,
    guildName,
    removed: true,
    requestedBy,
  });
}

async function simulateWelcomeEvent(guild, member, type) {
  const settings = await getWelcomeSettings(guild.id);
  const isGoodbye = type === 'goodbye';
  const channelId = isGoodbye ? settings.goodbye_channel_id : settings.welcome_channel_id;
  const channel = await requireTextChannel(guild, channelId, isGoodbye ? 'goodbye' : 'welcome');
  await sendMemberEvent(member, type, channel.id, true);
  return result(type, `${isGoodbye ? 'Goodbye' : 'Welcome'} simulation sent to #${channel.name}.`, channel);
}

async function simulateLevelUp(guild, member) {
  const settings = await getLevelSettings(guild.id);
  const channel = await requireTextChannel(guild, settings.channel_id, 'level-up');
  const current = await getUserLevel(guild.id, member.id);
  const previousLevel = Number(current.level || 0);
  const level = Math.max(1, previousLevel + 1);
  const neededXp = xpNeededForNextLevel(level);
  const totalXp = totalXpAtStartOfLevel(level) + Math.floor(neededXp * 0.48);
  const progress = progressForLevel(totalXp, level);
  const rank = await getUserRank(guild.id, member.id);
  const image = await createLevelCardBuffer({
    username: member.user.username,
    displayName: member.displayName || member.user.username,
    discriminator: member.user.discriminator,
    avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
    rank: rank || 1,
    level,
    previousLevel,
    currentXp: progress.current,
    neededXp: progress.needed,
    totalXp,
    accentColor: getMemberEmbedColor(member),
    backgroundUrl: await getCardBackground(guild.id, 'level').catch(() => null),
    title: `Level up! ${previousLevel} → ${level}`,
  });
  await channel.send({
    content: `${member} leveled up to **lvl ${level}**! *(simulation)*`,
    files: [new AttachmentBuilder(image, { name: 'level-up-simulation.png' })],
  });
  return result('level-up', `Level-up simulation sent to #${channel.name}.`, channel, { level, previousLevel });
}

async function simulateLogEvent(guild, event, member) {
  const settings = await getLogSettings(guild.id);
  const channel = await requireTextChannel(guild, settings.channel_id, 'log');
  const common = [{ name: 'Simulation', value: 'Triggered from the Meowz dashboard.', inline: false }];
  const map = {
    'log-message': ['message', 'Message deleted · simulation', [
      { name: 'Author', value: `${member.user.tag || member.user.username} (${member.id})`, inline: false },
      { name: 'Channel', value: '#general', inline: true },
      { name: 'Content', value: 'Example deleted message.', inline: false },
      ...common,
    ], 0xfee75c],
    'log-member': ['member', 'Member joined · simulation', [
      { name: 'Member', value: `${member.user.tag || member.user.username} (${member.id})`, inline: false },
      { name: 'Members', value: String(guild.memberCount || 'Unknown'), inline: true },
      ...common,
    ], 0x57f287],
    'log-moderation': ['moderation', 'Moderation action · simulation', [
      { name: 'Action', value: 'Dashboard test warning', inline: true },
      { name: 'User', value: `${member.user.tag || member.user.username} (${member.id})`, inline: false },
      ...common,
    ], 0xed4245],
    'log-voice': ['voice', 'Voice activity · simulation', [
      { name: 'Member', value: `${member.user.tag || member.user.username} (${member.id})`, inline: false },
      { name: 'Action', value: 'Joined a voice channel', inline: true },
      ...common,
    ], 0x9b59b6],
  };
  const config = map[event];
  if (!config) throw Object.assign(new Error('Unsupported log simulation.'), { statusCode: 400 });
  const sent = await sendLog(guild, config[0], config[1], config[2], config[3]);
  if (!sent) {
    throw Object.assign(new Error('That log type is disabled. Enable it and save the settings before simulating.'), { statusCode: 400 });
  }
  return result(event, `${config[1]} sent to #${channel.name}.`, channel);
}

async function simulateModeration(guild, member) {
  const settings = await getModerationSettings(guild.id);
  const channel = await requireTextChannel(guild, settings.mod_log_channel_id, 'moderation log');
  const sent = await sendModerationLog(guild, 'Automod action · simulation', [
    { name: 'Reason', value: 'Dashboard test — no message was deleted and no member was punished.', inline: false },
    { name: 'User', value: `${member.user.tag || member.user.username} (${member.id})`, inline: false },
    { name: 'Filters', value: `Blocked words: ${settings.automod_enabled ? 'on' : 'off'} · Anti-spam: ${settings.anti_spam ? 'on' : 'off'} · Links: ${settings.link_filter ? 'on' : 'off'} · Invites: ${settings.invite_filter ? 'on' : 'off'}`, inline: false },
  ]);
  if (!sent) throw Object.assign(new Error('The moderation log channel could not receive the simulation.'), { statusCode: 400 });
  return result('moderation', `Moderation simulation sent to #${channel.name}.`, channel);
}

async function simulateImageAccess(client, guild, member) {
  const allowedByRole = member.permissions?.has(PermissionFlagsBits.ManageGuild) || member.id === botOwnerId(client);
  const manuallyAllowed = await isUserAllowedForEditImage(guild.id, member.id).catch(() => false);
  const allowed = Boolean(allowedByRole || manuallyAllowed);
  return result('image-access', allowed
    ? `${member.displayName} is allowed to use AI image editing.`
    : `${member.displayName} is not currently allowed to use AI image editing.`, null, {
      allowed,
      userId: member.id,
      source: allowedByRole ? 'default-permission' : manuallyAllowed ? 'manual-access' : 'none',
    });
}

async function runDashboardSimulation(client, guild, event, options = {}) {
  const normalized = String(event || '').trim().toLowerCase();
  if (normalized === 'connection') {
    return result('connection', `Meowz is connected to ${guild.name}.`, null, {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount || 0,
      online: client.isReady(),
    });
  }
  if (normalized === 'owner-remove-guild') return removeGuildFromDashboard(client, guild, options);

  const member = await resolveMember(guild, options.userId);
  if (normalized === 'welcome' || normalized === 'goodbye') return simulateWelcomeEvent(guild, member, normalized);
  if (normalized === 'level-up') return simulateLevelUp(guild, member);
  if (normalized === 'image-access') return simulateImageAccess(client, guild, member);
  if (normalized.startsWith('log-')) return simulateLogEvent(guild, normalized, member);
  if (normalized === 'moderation') return simulateModeration(guild, member);
  throw Object.assign(new Error('Unsupported dashboard simulation event.'), { statusCode: 400 });
}

module.exports = { runDashboardSimulation };
