const { request } = require("undici");

async function postJson(url, body) {
  const res = await request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.body.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Roblox API ${res.statusCode}: ${text.slice(0, 200)}`);
  return json;
}

async function getJson(url) {
  const res = await request(url);
  const text = await res.body.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Roblox API ${res.statusCode}: ${text.slice(0, 200)}`);
  return json;
}

async function resolveUsername(username) {
  const data = await postJson("https://users.roblox.com/v1/usernames/users", {
    usernames: [username],
    excludeBannedUsers: true,
  });
  const hit = data?.data?.[0];
  if (!hit?.id) throw new Error("Roblox user not found");
  return { userId: hit.id, name: hit.name, displayName: hit.displayName };
}

async function getPresence(userId) {
  const data = await postJson("https://presence.roblox.com/v1/presence/users", { userIds: [Number(userId)] });
  const p = data?.userPresences?.[0];
  if (!p) throw new Error("Presence not available");
  return {
    presenceType: p.userPresenceType,
    lastLocation: p.lastLocation || null,
    placeId: p.placeId || null,
    universeId: p.universeId || null,
  };
}

async function getPlaceDetails(placeId) {
  const url = `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${encodeURIComponent(placeId)}`;
  const data = await getJson(url);
  const hit = data?.[0];
  if (!hit) return null;
  return { name: hit.name || null, universeId: hit.universeId || null, placeId: hit.placeId || placeId };
}

async function getGameIcon(universeId) {
  if (!universeId) return null;
  const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(universeId)}&size=128x128&format=Png&isCircular=false`;
  const data = await getJson(url);
  return data?.data?.[0]?.imageUrl || null;
}

module.exports = { resolveUsername, getPresence, getPlaceDetails, getGameIcon };
