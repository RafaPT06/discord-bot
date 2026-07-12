const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLogSettings, getModerationSettings } = require('./serverSettings');
const { isUserModerationBypassed } = require('./moderationAccess');

const recentMessages = new Map();

function trim(text, max = 900) {
  const value = String(text || '').trim();
  if (!value) return 'No content available.';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function sendToConfiguredChannel(guild, channelId, embed) {
  if (!guild || !channelId) return false;
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return false;
  await channel.send({ embeds: [embed] }).catch(() => null);
  return true;
}

async function sendLog(guild, kind, title, fields = [], color = 0x5865f2) {
  const settings = await getLogSettings(guild.id).catch(() => null);
  if (!settings?.enabled || !settings.channel_id) return false;
  if (kind === 'message' && settings.message_events === false) return false;
  if (kind === 'member' && settings.member_events === false) return false;
  if (kind === 'moderation' && settings.moderation_events === false) return false;
  if (kind === 'voice' && settings.voice_events !== true) return false;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .addFields(fields.filter(Boolean).map((field) => ({ ...field, value: trim(field.value, 1000) })));
  return sendToConfiguredChannel(guild, settings.channel_id, embed);
}

async function sendModerationLog(guild, title, fields = [], color = 0xed4245) {
  const settings = await getModerationSettings(guild.id).catch(() => null);
  const channelId = settings?.mod_log_channel_id;
  if (!channelId) return false;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .addFields(fields.filter(Boolean).map((field) => ({ ...field, value: trim(field.value, 1000) })));
  return sendToConfiguredChannel(guild, channelId, embed);
}

async function handleLoggedMessageDelete(message) {
  if (!message?.guild || message.author?.bot) return;
  await sendLog(message.guild, 'message', 'Message deleted', [
    { name: 'Author', value: message.author ? `${message.author.tag || message.author.username} (${message.author.id})` : 'Unknown', inline: false },
    { name: 'Channel', value: `${message.channel}`, inline: true },
    { name: 'Content', value: trim(message.content), inline: false },
  ], 0xfee75c);
}

async function handleLoggedMessageUpdate(oldMessage, newMessage) {
  const message = newMessage || oldMessage;
  if (!message?.guild || message.author?.bot) return;
  const before = oldMessage?.content || '';
  const after = newMessage?.content || '';
  if (!before || !after || before === after) return;
  await sendLog(message.guild, 'message', 'Message edited', [
    { name: 'Author', value: `${message.author.tag || message.author.username} (${message.author.id})`, inline: false },
    { name: 'Channel', value: `${message.channel}`, inline: true },
    { name: 'Before', value: trim(before, 450), inline: false },
    { name: 'After', value: trim(after, 450), inline: false },
  ], 0x3498db);
}

async function handleLoggedMemberJoin(member) {
  if (!member?.guild) return;
  await sendLog(member.guild, 'member', 'Member joined', [
    { name: 'Member', value: `${member.user?.tag || member.user?.username || member.id} (${member.id})`, inline: false },
    { name: 'Members', value: String(member.guild.memberCount || 'Unknown'), inline: true },
  ], 0x57f287);
}

async function handleLoggedMemberLeave(member) {
  if (!member?.guild) return;
  await sendLog(member.guild, 'member', 'Member left', [
    { name: 'Member', value: `${member.user?.tag || member.user?.username || member.id} (${member.id})`, inline: false },
    { name: 'Members', value: String(member.guild.memberCount || 'Unknown'), inline: true },
  ], 0xed4245);
}

async function handleLoggedGuildBan(ban) {
  if (!ban?.guild || !ban.user) return;
  await sendLog(ban.guild, 'moderation', 'Member banned', [
    { name: 'User', value: `${ban.user.tag || ban.user.username} (${ban.user.id})`, inline: false },
    { name: 'Reason', value: ban.reason || 'No reason provided.', inline: false },
  ], 0xed4245);
}

async function handleLoggedVoiceState(oldState, newState) {
  const guild = newState?.guild || oldState?.guild;
  if (!guild) return;
  if (oldState.channelId === newState.channelId) return;
  const member = newState.member || oldState.member;
  const action = !oldState.channelId ? 'joined voice' : !newState.channelId ? 'left voice' : 'moved voice channels';
  await sendLog(guild, 'voice', `Member ${action}`, [
    { name: 'Member', value: `${member?.user?.tag || member?.id || 'Unknown'}`, inline: false },
    { name: 'From', value: oldState.channel ? `${oldState.channel}` : 'None', inline: true },
    { name: 'To', value: newState.channel ? `${newState.channel}` : 'None', inline: true },
  ], 0x9b59b6);
}

function hasDiscordInvite(content) {
  return /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\//i.test(content || '');
}

function hasExternalLink(content) {
  return /https?:\/\//i.test(content || '');
}

function isSpam(message) {
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const bucket = (recentMessages.get(key) || []).filter((item) => now - item.at < 7000);
  bucket.push({ at: now, content: message.content });
  recentMessages.set(key, bucket);
  if (bucket.length >= 5) return true;
  const repeated = bucket.filter((item) => item.content === message.content).length;
  return repeated >= 3;
}

async function handleModerationMessage(message) {
  if (!message?.guild || message.author?.bot || !message.content) return false;
  const settings = await getModerationSettings(message.guild.id).catch(() => null);
  if (!settings?.enabled) return false;

  const ownerId = String(process.env.OWNER_ID || process.env.BOT_OWNER_ID || '');
  const hasDefaultBypass = message.author.id === ownerId
    || message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
  const hasManualBypass = hasDefaultBypass
    ? false
    : await isUserModerationBypassed(message.guild.id, message.author.id).catch(() => false);
  if (hasDefaultBypass || hasManualBypass) return false;

  const content = message.content;
  const blockedWords = String(settings.blocked_words || '')
    .split(/[\n,]/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  let reason = null;
  if (settings.invite_filter && hasDiscordInvite(content)) reason = 'Discord invite link';
  else if (settings.link_filter && hasExternalLink(content)) reason = 'External link';
  else if (settings.anti_spam && isSpam(message)) reason = 'Spam detected';
  else if (settings.automod_enabled && blockedWords.some((word) => content.toLowerCase().includes(word))) reason = 'Blocked word';

  if (!reason) return false;

  await message.delete().catch(() => null);
  await sendModerationLog(message.guild, 'Automod action', [
    { name: 'Reason', value: reason, inline: true },
    { name: 'User', value: `${message.author.tag || message.author.username} (${message.author.id})`, inline: false },
    { name: 'Channel', value: `${message.channel}`, inline: true },
    { name: 'Content', value: trim(content, 600), inline: false },
  ]);
  await sendLog(message.guild, 'moderation', 'Automod action', [
    { name: 'Reason', value: reason, inline: true },
    { name: 'User', value: `${message.author.tag || message.author.username} (${message.author.id})`, inline: false },
    { name: 'Channel', value: `${message.channel}`, inline: true },
  ], 0xed4245);
  return true;
}

module.exports = {
  handleLoggedMessageDelete,
  handleLoggedMessageUpdate,
  handleLoggedMemberJoin,
  handleLoggedMemberLeave,
  handleLoggedGuildBan,
  handleLoggedVoiceState,
  handleModerationMessage,
  sendLog,
  sendModerationLog,
};
