const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, getVoiceConnection } = require('@discordjs/voice');
const path = require('node:path');
const fs = require('node:fs');
const { getQueue, addToQueue, clearQueue } = require('./musicQueue');
const players = new Map();

function catalog() {
  const directory = process.env.MEOWZ_MUSIC_DIR;
  if (!directory || !path.isAbsolute(directory)) return [];
  try {
    return fs.readdirSync(directory).filter(name => /^[a-zA-Z0-9 _.-]{1,100}\.(ogg|opus|mp3|wav)$/i.test(name))
      .map(name => ({ id: name, title: path.parse(name).name }));
  } catch { return []; }
}
function state(guildId) {
  const entry = players.get(guildId);
  return { current: entry?.current || null, status: entry?.player.state.status || 'idle', queue: getQueue(guildId), tracks: catalog() };
}
function next(guildId) {
  const entry = players.get(guildId);
  if (!entry || !getVoiceConnection(guildId)) return;
  const item = getQueue(guildId).shift();
  if (!item) { entry.current = null; return; }
  const directory = process.env.MEOWZ_MUSIC_DIR;
  const track = catalog().find(candidate => candidate.id === item.id);
  if (!track) { next(guildId); return; }
  entry.current = track;
  try { entry.player.play(createAudioResource(path.join(directory, track.id))); }
  catch { entry.current = null; next(guildId); }
}
function enqueue(guildId, id) {
  const connection = getVoiceConnection(guildId);
  if (!connection) throw Object.assign(new Error('Join a voice channel first.'), { statusCode: 409 });
  const track = catalog().find(item => item.id === id);
  if (!track) throw Object.assign(new Error('Track unavailable.'), { statusCode: 404 });
  let entry = players.get(guildId);
  if (!entry) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
    entry = { player, current: null };
    players.set(guildId, entry);
    player.on(AudioPlayerStatus.Idle, () => next(guildId));
    player.on('error', () => next(guildId));
  }
  connection.subscribe(entry.player);
  addToQueue(guildId, track);
  if (!entry.current) next(guildId);
  return state(guildId);
}
function control(guildId, action) {
  const entry = players.get(guildId);
  if (!['pause', 'resume', 'skip', 'stop'].includes(action)) throw Object.assign(new Error('Invalid action.'), { statusCode: 400 });
  if (!entry) return state(guildId);
  if (action === 'pause') entry.player.pause();
  if (action === 'resume') entry.player.unpause();
  if (action === 'skip') { entry.current = null; entry.player.stop(true); }
  if (action === 'stop') { clearQueue(guildId); entry.current = null; entry.player.stop(true); }
  return state(guildId);
}
function cleanup(guildId) {
  const entry = players.get(guildId);
  if (entry) { entry.player.stop(true); players.delete(guildId); }
  clearQueue(guildId);
}
module.exports = { catalog, state, enqueue, control, cleanup };
