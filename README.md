# discord-bot

## Quick start

1) Install deps

```bash
npm i
```

2) Create a `.env` (or set Railway Variables)

Required:

- `BOT_TOKEN`
- `APP_ID`
- `OWNER_ID`

Optional:

- `DATABASE_URL` (enables Postgres features)
- `CHANNEL_ID` (fallback deploy updates channel if DB is off)
- `TEST_GUILD_ID` (for fast command deploy while testing)

3) Deploy slash commands

```bash
npm run deploy
```

4) Run the bot

```bash
npm start
```

## Project structure

All logic lives in `src/`.

- `index.js` (root) -> loads `src/index.js` (kept compatible with Railway `npm start`)
- `deploy-commands.js` (root) -> loads `src/deploy-commands.js`

Key folders:

- `src/commands` – slash command handlers
- `src/handlers` – interaction/button routing
- `src/db` – Postgres schema + queries (optional)
- `src/services` – deploy notifier, etc.
- `src/utils` – small helpers
