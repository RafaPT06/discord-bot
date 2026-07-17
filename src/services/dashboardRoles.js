const { AuditLogEvent } = require('discord.js');
const { pool } = require('../db/pool');

let tableReady = null;
const auditBackfillAt = new Map();
const AUDIT_BACKFILL_MS = 5 * 60 * 1000;

function ensureTable() {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_created_roles (
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        role_name TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, role_id)
      );
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

async function trackDashboardRole(guildId, role, { createdBy = null, createdAt = null } = {}) {
  if (!guildId || !role?.id || !role?.name) return null;
  await ensureTable();
  const { rows } = await pool.query(`
    INSERT INTO dashboard_created_roles (guild_id, role_id, role_name, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), NOW())
    ON CONFLICT (guild_id, role_id)
    DO UPDATE SET
      role_name = EXCLUDED.role_name,
      created_by = COALESCE(dashboard_created_roles.created_by, EXCLUDED.created_by),
      updated_at = NOW()
    RETURNING guild_id, role_id, role_name, created_by, created_at, updated_at;
  `, [String(guildId), String(role.id), String(role.name), createdBy ? String(createdBy) : null, createdAt || null]);
  return rows[0] || null;
}

async function getDashboardRoleRecord(guildId, roleId) {
  await ensureTable();
  const { rows } = await pool.query(`
    SELECT guild_id, role_id, role_name, created_by, created_at, updated_at
    FROM dashboard_created_roles
    WHERE guild_id = $1 AND role_id = $2
    LIMIT 1;
  `, [String(guildId), String(roleId)]);
  return rows[0] || null;
}

async function listDashboardRoleRecords(guildId) {
  await ensureTable();
  const { rows } = await pool.query(`
    SELECT guild_id, role_id, role_name, created_by, created_at, updated_at
    FROM dashboard_created_roles
    WHERE guild_id = $1
    ORDER BY created_at ASC;
  `, [String(guildId)]);
  return rows;
}

async function removeDashboardRoleRecord(guildId, roleId) {
  await ensureTable();
  await pool.query('DELETE FROM dashboard_created_roles WHERE guild_id = $1 AND role_id = $2;', [String(guildId), String(roleId)]);
}

async function pruneDashboardRoleRecords(guildId, existingRoleIds) {
  await ensureTable();
  const ids = [...new Set((existingRoleIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    await pool.query('DELETE FROM dashboard_created_roles WHERE guild_id = $1;', [String(guildId)]);
    return;
  }
  await pool.query(`
    DELETE FROM dashboard_created_roles
    WHERE guild_id = $1 AND NOT (role_id = ANY($2::text[]));
  `, [String(guildId), ids]);
}

async function backfillDashboardRolesFromAuditLog(guild, botUserId) {
  if (!guild?.id || !botUserId) return;
  const last = auditBackfillAt.get(guild.id) || 0;
  if (Date.now() - last < AUDIT_BACKFILL_MS) return;
  auditBackfillAt.set(guild.id, Date.now());

  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 100 });
    const entries = [...logs.entries.values()].filter((entry) => {
      const reason = String(entry.reason || '');
      return String(entry.executorId || entry.executor?.id || '') === String(botUserId)
        && reason.startsWith('Created from the Meowz dashboard');
    });

    await Promise.all(entries.map(async (entry) => {
      const roleId = String(entry.targetId || entry.target?.id || '');
      const role = guild.roles.cache.get(roleId);
      if (!role) return;
      await trackDashboardRole(guild.id, role, {
        createdBy: null,
        createdAt: entry.createdAt?.toISOString?.() || null,
      });
    }));
  } catch {
    // Audit-log access is optional. New dashboard-created roles are tracked directly.
  }
}

module.exports = {
  backfillDashboardRolesFromAuditLog,
  getDashboardRoleRecord,
  listDashboardRoleRecords,
  pruneDashboardRoleRecords,
  removeDashboardRoleRecord,
  trackDashboardRole,
};
