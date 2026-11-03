const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

const JOINABLE = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
const busyGuilds = new Set();

function listVoiceChannels(guild) {
  const me = guild.members.me;
  return [...guild.channels.cache.values()]
    .filter(channel => JOINABLE.has(channel.type))
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map(channel => {
      const permissions = me ? channel.permissionsFor(me) : null;
      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId,
        joinable: Boolean(permissions?.has(PermissionFlagsBits.ViewChannel) && permissions.has(PermissionFlagsBits.Connect)),
        full: Boolean(channel.userLimit && channel.members.size >= channel.userLimit),
      };
    });
}

function currentVoiceState(guild) {
  const connection = getVoiceConnection(guild.id);
  return { connected: Boolean(connection && connection.state.status !== VoiceConnectionStatus.Destroyed), channelId: connection?.joinConfig.channelId || null, status: connection?.state.status || 'disconnected' };
}

async function joinSelectedChannel(guild, channelId) {
  if (busyGuilds.has(guild.id)) {
    const error = new Error('Voice connection operation already in progress.');
    error.statusCode = 409;
    throw error;
  }
  busyGuilds.add(guild.id);
  try {
    const channel = guild.channels.cache.get(String(channelId));
    if (!channel || !JOINABLE.has(channel.type)) {
      const error = new Error('Select a valid voice channel.');
      error.statusCode = 400;
      throw error;
    }
    const me = guild.members.me || await guild.members.fetchMe();
    const permissions = channel.permissionsFor(me);
    if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.Connect)) {
      const error = new Error('Meowz needs View Channel and Connect permissions.');
      error.statusCode = 403;
      throw error;
    }
    if (channel.userLimit && channel.members.size >= channel.userLimit && !permissions.has(PermissionFlagsBits.MoveMembers)) {
      const error = new Error('The selected voice channel is full.');
      error.statusCode = 409;
      throw error;
    }
    const previous = getVoiceConnection(guild.id);
    if (previous?.joinConfig.channelId === channel.id && previous.state.status === VoiceConnectionStatus.Ready) return currentVoiceState(guild);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15000);
    } catch {
      connection.destroy();
      const error = new Error('Meowz could not establish a voice connection.');
      error.statusCode = 504;
      throw error;
    }
    return currentVoiceState(guild);
  } finally {
    busyGuilds.delete(guild.id);
  }
}

function disconnectVoice(guild) {
  if (busyGuilds.has(guild.id)) {
    const error = new Error('Voice connection operation already in progress.');
    error.statusCode = 409;
    throw error;
  }
  const connection = getVoiceConnection(guild.id);
  if (connection) connection.destroy();
  return currentVoiceState(guild);
}

module.exports = { listVoiceChannels, currentVoiceState, joinSelectedChannel, disconnectVoice };
