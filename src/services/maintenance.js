const { pool } = require("../db/pool");

async function getMaintenanceEnabled() {
  const { rows } = await pool.query("SELECT value FROM app_state WHERE key='maintenance_enabled' LIMIT 1");
  if (!rows.length) return false;
  return rows[0].value === "true";
}

async function setMaintenanceEnabled(enabled) {
  await pool.query(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES ('maintenance_enabled', $1, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [enabled ? "true" : "false"]
  );
}

module.exports = { getMaintenanceEnabled, setMaintenanceEnabled };
