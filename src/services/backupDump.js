const { pool } = require("../db/pool");

async function listPublicTables() {
  const res = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  return (res.rows || []).map((r) => r.tablename);
}

async function dumpAllTables() {
  const tables = await listPublicTables();
  const out = {
    meta: {
      created_at: new Date().toISOString(),
      tables,
    },
    data: {},
  };

  for (const t of tables) {
    // Quote table name safely
    const q = `SELECT * FROM "${t.replace(/\"/g, '""')}"`;
    const res = await pool.query(q);
    out.data[t] = res.rows || [];
  }

  return out;
}

module.exports = { dumpAllTables };
