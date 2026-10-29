const { pool } = require('../db/pool');

const SNAPSHOT_VERSION = 1;

function sortByPositionThenId(a, b) {
  return Number(a.rawPosition ?? a.position ?? 0) - Number(b.rawPosition ?? b.position ?? 0)
    || String(a.id).localeCompare(String(b.id));
}

function serializeOverwrite(overwrite) {
  return {
    id: String(overwrite.id),
    type: Number(overwrite.type),
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  };
}

function serializeRole(role) {
  return {
    id: String(role.id),
    name: role.name,
    color: Number(role.color || 0),
    hoist: Boolean(role.hoist),
    icon: role.icon || null,
    unicodeEmoji: role.unicodeEmoji || null,
    position: Number(role.rawPosition ?? role.position ?? 0),
    permissions: role.permissions.bitfield.toString(),
    mentionable: Boolean(role.mentionable),
    managed: Boolean(role.managed),
    tags: role.tags || null,
  };
}

function serializeChannel(channel) {
  const data = {
    id: String(channel.id),
    name: channel.name,
    type: Number(channel.type),
    parentId: channel.parentId ? String(channel.parentId) : null,
    position: Number(channel.rawPosition ?? channel.position ?? 0),
    permissionOverwrites: channel.permissionOverwrites?.cache
      ? [...channel.permissionOverwrites.cache.values()].map(serializeOverwrite).sort((a, b) => a.id.localeCompare(b.id))
      : [],
  };

  for (const key of ['topic', 'nsfw', 'rateLimitPerUser', 'bitrate', 'userLimit', 'rtcRegion', 'videoQualityMode', 'defaultAutoArchiveDuration', 'defaultThreadRateLimitPerUser', 'defaultSortOrder', 'defaultForumLayout']) {
    if (channel[key] !== undefined) data[key] = channel[key];
  }

  if (Array.isArray(channel.availableTags)) {
    data.availableTags = channel.availableTags.map((tag) => ({
      id: String(tag.id),
      name: tag.name,
      moderated: Boolean(tag.moderated),
      emojiId: tag.emojiId || null,
      emojiName: tag.emojiName || null,
    }));
  }

  return data;
}

async function captureServerLayout(guild) {
  await Promise.all([
    guild.roles.fetch().catch(() => null),
    guild.channels.fetch().catch(() => null),
  ]);

  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id)
    .sort(sortByPositionThenId)
    .map(serializeRole);

  const channels = [...guild.channels.cache.values()]
    .filter(Boolean)
    .sort(sortByPositionThenId)
    .map(serializeChannel);

  return {
    version: SNAPSHOT_VERSION,
    capturedAt: new Date().toISOString(),
    guild: {
      id: String(guild.id),
      name: guild.name,
      description: guild.description || null,
      verificationLevel: Number(guild.verificationLevel),
      explicitContentFilter: Number(guild.explicitContentFilter),
      defaultMessageNotifications: Number(guild.defaultMessageNotifications),
      afkChannelId: guild.afkChannelId ? String(guild.afkChannelId) : null,
      afkTimeout: Number(guild.afkTimeout || 0),
      systemChannelId: guild.systemChannelId ? String(guild.systemChannelId) : null,
      rulesChannelId: guild.rulesChannelId ? String(guild.rulesChannelId) : null,
      publicUpdatesChannelId: guild.publicUpdatesChannelId ? String(guild.publicUpdatesChannelId) : null,
      preferredLocale: guild.preferredLocale || null,
    },
    roles,
    channels,
    counts: { roles: roles.length, channels: channels.length },
  };
}

async function createLayoutSnapshot(guild, { name = null, reason = null, createdBy = null } = {}) {
  const layout = await captureServerLayout(guild);
  const result = await pool.query(
    `INSERT INTO server_layout_snapshots (guild_id, name, reason, created_by, snapshot_version, layout)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, guild_id, name, reason, created_by, snapshot_version, created_at`,
    [guild.id, name, reason, createdBy, SNAPSHOT_VERSION, JSON.stringify(layout)],
  );
  return { ...result.rows[0], layout };
}

async function listLayoutSnapshots(guildId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const result = await pool.query(
    `SELECT id, guild_id, name, reason, created_by, snapshot_version, created_at,
            jsonb_array_length(layout->'roles') AS role_count,
            jsonb_array_length(layout->'channels') AS channel_count
       FROM server_layout_snapshots
      WHERE guild_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [guildId, safeLimit],
  );
  return result.rows;
}

async function getLayoutSnapshot(guildId, snapshotId) {
  const result = await pool.query(
    `SELECT id, guild_id, name, reason, created_by, snapshot_version, layout, created_at
       FROM server_layout_snapshots WHERE guild_id = $1 AND id = $2 LIMIT 1`,
    [guildId, snapshotId],
  );
  return result.rows[0] || null;
}

function comparable(value) {
  const copy = { ...value };
  delete copy.id;
  return JSON.stringify(copy);
}

function diffCollection(currentItems, snapshotItems, kind) {
  const current = new Map(currentItems.map((item) => [String(item.id), item]));
  const saved = new Map(snapshotItems.map((item) => [String(item.id), item]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of current) {
    if (!saved.has(id)) added.push(item);
    else if (comparable(item) !== comparable(saved.get(id))) changed.push({ id, kind, before: saved.get(id), after: item });
  }
  for (const [id, item] of saved) if (!current.has(id)) removed.push(item);
  return { added, removed, changed };
}

async function diffLayoutSnapshot(guild, snapshot) {
  const current = await captureServerLayout(guild);
  const saved = snapshot.layout || {};
  const roles = diffCollection(current.roles || [], saved.roles || [], 'role');
  const channels = diffCollection(current.channels || [], saved.channels || [], 'channel');
  return {
    snapshotId: String(snapshot.id),
    comparedAt: new Date().toISOString(),
    current,
    summary: {
      roles: { added: roles.added.length, removed: roles.removed.length, changed: roles.changed.length },
      channels: { added: channels.added.length, removed: channels.removed.length, changed: channels.changed.length },
      totalChanges: roles.added.length + roles.removed.length + roles.changed.length + channels.added.length + channels.removed.length + channels.changed.length,
    },
    changes: { roles, channels },
  };
}

module.exports = {
  SNAPSHOT_VERSION,
  captureServerLayout,
  createLayoutSnapshot,
  listLayoutSnapshots,
  getLayoutSnapshot,
  diffLayoutSnapshot,
};
