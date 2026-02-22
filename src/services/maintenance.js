const { pool } = require("../db/pool");

async function getMaintenanceEnabled() {
  const { rows } = await pool.query(
    "SELECT value FROM app_state WHERE key='maintenance_enabled' LIMIT 1"
  );
  if (!rows.length) return false;
  return rows[0].value === "true";
}

async function setMaintenanceEnabled(enabled) {
  // Avoid referencing optional columns (older DBs might not have them yet)
  await pool.query(
    `INSERT INTO app_state (key, value)
     VALUES ('maintenance_enabled', $1)
     ON CONFLICT (key)
     DO UPDATE SET value=EXCLUDED.value`,
    [enabled ? "true" : "false"]
  );

  // Best-effort updated_at (won't fail if column doesn't exist)
  try {
    await pool.query(
      "UPDATE app_state SET updated_at=NOW() WHERE key='maintenance_enabled'"
    );
  } catch {
    // ignore
  }
}

module.exports = { getMaintenanceEnabled, setMaintenanceEnabled };
