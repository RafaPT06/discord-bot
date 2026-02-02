require("dotenv").config();

function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

module.exports = {
  // Discord
  BOT_TOKEN: env("BOT_TOKEN"),
  APP_ID: env("APP_ID"),
  OWNER_ID: env("OWNER_ID"),

  // Optional: fallback deploy channel if DB is not configured
  CHANNEL_ID: env("CHANNEL_ID"),

  // Hosting
  PORT: Number(env("PORT", 8080)),
  TZ: env("TZ", "Europe/Lisbon"),

  // PostgreSQL
  DATABASE_URL: env("DATABASE_URL"),

  // GitHub deploy info (optional)
  GITHUB_TOKEN: env("GITHUB_TOKEN"),
  GITHUB_REPO: env("GITHUB_REPO"),
};
