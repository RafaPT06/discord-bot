const API = 'https://api.jamendo.com/v3.0';
const HOSTS = new Set(['prod-1.storage.jamendo.com', 'prod-2.storage.jamendo.com', 'storage.jamendo.com']);
function configured() { return Boolean(process.env.JAMENDO_CLIENT_ID); }
function validateId(id) { return /^[0-9]{1,16}$/.test(String(id || '')); }
async function query(endpoint, params) {
  if (!configured()) throw Object.assign(new Error('Set JAMENDO_CLIENT_ID on the bot service to enable online music.'), { statusCode: 503 });
  const url = new URL(API + endpoint);
  url.searchParams.set('client_id', process.env.JAMENDO_CLIENT_ID);
  url.searchParams.set('format', 'json');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw Object.assign(new Error('Online music provider unavailable.'), { statusCode: 502 });
  const body = await response.json();
  if (body.headers?.status !== 'success') throw Object.assign(new Error('Online music provider rejected the request.'), { statusCode: 502 });
  return body.results || [];
}
function normalize(track) {
  return { id: 'jamendo:' + track.id, title: String(track.name || '').slice(0, 120),
    artist: String(track.artist_name || '').slice(0, 100), image: track.image || null,
    duration: Number(track.duration || 0), source: 'Jamendo',
    license: String(track.license_ccurl || ''), url: String(track.shareurl || '') };
}
async function search(term) {
  const q = String(term || '').trim();
  if (q.length < 2 || q.length > 100) throw Object.assign(new Error('Search must be 2–100 characters.'), { statusCode: 400 });
  const results = await query('/tracks/', { search: q, limit: 15, include: 'licenses', audioformat: 'mp32' });
  return results.filter(track => track.id && track.audio).map(normalize);
}
async function resolve(id) {
  const raw = String(id || '').replace(/^jamendo:/, '');
  if (!validateId(raw)) throw Object.assign(new Error('Invalid track ID.'), { statusCode: 400 });
  const results = await query('/tracks/', { id: raw, limit: 1, include: 'licenses', audioformat: 'mp32' });
  const track = results.find(item => String(item.id) === raw && item.audio);
  if (!track) throw Object.assign(new Error('Track is unavailable.'), { statusCode: 404 });
  const url = new URL(track.audio);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !HOSTS.has(url.hostname))
    throw Object.assign(new Error('Provider returned an unsupported audio host.'), { statusCode: 502 });
  return { ...normalize(track), audio: url.toString() };
}
module.exports = { configured, search, resolve };
