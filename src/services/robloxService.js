const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Resolve a Roblox username to userId.
 * @param {string} username
 * @returns {Promise<{userId:number, username:string}>}
 */
async function resolveUsername(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Roblox resolve failed (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const item = data?.data?.[0];
  if (!item?.id) {
    throw new Error("Roblox user not found.");
  }
  return { userId: Number(item.id), username: item.name || username };
}

/**
 * Get presence for a Roblox userId.
 * @param {number} userId
 * @returns {Promise<{presenceType:number, lastLocation?:string, placeId?:number}>}
 */
async function getPresence(userId) {
  const res = await fetch("https://presence.roblox.com/v1/presence/users", {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ userIds: [userId] }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Roblox presence failed (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const u = data?.userPresences?.[0];
  return {
    presenceType: Number(u?.userPresenceType ?? 0),
    lastLocation: u?.lastLocation || undefined,
    placeId: u?.placeId ? Number(u.placeId) : undefined,
  };
}

/**
 * Try to resolve placeId -> experience metadata.
 * @param {number} placeId
 * @returns {Promise<{name?:string, universeId?:number}>}
 */
async function getPlaceDetails(placeId) {
  const url = `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${encodeURIComponent(
    String(placeId)
  )}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) return {};
  const data = await res.json().catch(() => null);
  const item = Array.isArray(data) ? data[0] : null;
  return {
    name: item?.name || undefined,
    universeId: item?.universeId ? Number(item.universeId) : undefined,
  };
}

/**
 * Get game icon thumbnail for a universeId.
 * @param {number} universeId
 * @returns {Promise<{imageUrl?:string}>}
 */
async function getGameIcon(universeId) {
  const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(
    String(universeId)
  )}&size=150x150&format=Png&isCircular=false`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) return {};
  const data = await res.json().catch(() => null);
  const item = data?.data?.[0];
  const imageUrl = item?.imageUrl || item?.thumbnailUrl || undefined;
  return { imageUrl };
}

function presenceLabel(presenceType) {
  switch (presenceType) {
    case 1:
      return "🟢 Online";
    case 2:
      return "🎮 In Game";
    case 3:
      return "🛠️ In Studio";
    default:
      return "🔴 Offline";
  }
}

/**
 * High-level helper: username -> presence + optional experience + icon.
 * @param {string} username
 * @returns {Promise<{userId:number, username:string, presenceType:number, lastLocation?:string, placeId?:number, experienceName?:string, iconUrl?:string}>}
 */
async function getPresenceSummary(username) {
  const resolved = await resolveUsername(username);
  const presence = await getPresence(resolved.userId);

  let experienceName;
  let iconUrl;

  if (presence.placeId) {
    const details = await getPlaceDetails(presence.placeId).catch(() => ({}));
    experienceName = details?.name;

    if (details?.universeId) {
      const icon = await getGameIcon(details.universeId).catch(() => ({}));
      iconUrl = icon?.imageUrl;
    }
  }

  return {
    userId: resolved.userId,
    username: resolved.username || username,
    presenceType: presence.presenceType,
    lastLocation: presence.lastLocation,
    placeId: presence.placeId,
    experienceName,
    iconUrl,
  };
}

module.exports = {
  resolveUsername,
  getPresence,
  getPlaceDetails,
  getGameIcon,
  presenceLabel,
  getPresenceSummary,
};
