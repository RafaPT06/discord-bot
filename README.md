# Discord Bot

A modular Discord bot built for automation, monitoring, and admin tooling.

## Main UI

- `/help` — Interactive help with tabs (Fun / Admin / Owner)
- `/panel` — Control panel with buttons (Overview / Channels / Diag / Feed / Perms / Sim)

## Public Commands

- `/compliment [user]`
- `/roast [user]`
- `/mimic <text>`
- `/cat`
- `/crazy`
- `/ping`

## Admin / Manage Server (default)

These require **Manage Server** by default (or a custom `/perm_set` override):

- Setup: `/setup_channels`
- Deploy channel: `/set_deploy_channel` `/show_deploy_channel` `/reset_deploy_channel`
- Backup channel: `/set_backup_channel` `/show_backup_channel` `/reset_backup_channel` `/test_backup`
- Feed: `/set_feed_channel` `/show_feed_channel` `/reset_feed_channel` `/feed_level` `/feed_test`
- Roblox alerts: `/set_roblox_alert_channel` `/show_roblox_alert_channel` `/reset_roblox_alert_channel`
- Error alerts: `/set_error_alert_channel` `/show_error_alert_channel` `/reset_error_alert_channel` `/test_error_alert`
- Content: `/add_compliment` `/remove_compliment` `/list_compliments`, `/add_roast` `/remove_roast` `/list_roasts`
- TODOs: `/todo_add` `/todo_list` `/todo_done`
- Permissions: `/perm_set` `/perm_add_role` `/perm_show` `/perm_list` `/perm_clear`
- Deploy test: `/deploy_test`

## Owner (default)

Owner-only by default (can be overridden with `/perm_set` if you want):

- `/edit_image <image> <prompt>` — edit an uploaded image with OpenAI
- `/maintenance <on|off|status>`
- `/roblox_status`
- Simulation: `/simulate_deploy` `/simulate_error` `/simulate_backup` `/simulate_roblox` `/simulate_feed`


## Setup

1. Install:
```bash
npm install
```

2. Deploy slash commands:
```bash
npm run deploy
```

3. Run:
```bash
node index.js
```

## Environment Variables

Required:
- `BOT_TOKEN`
- `OWNER_ID`
- `DATABASE_URL`

Optional:
- `ROBLOX_USERNAME`
- `OPENAI_API_KEY` — required only for `/edit_image`
- `OPENAI_IMAGE_MODEL` — defaults to `gpt-image-1-mini`

## Notes

- This bot uses PostgreSQL (Railway) for settings and data.
- The deploy script auto-loads commands from `src/commands/*.js`.


## Panel

`/panel` is the main control center. It includes:
- Overview (live status)
- Channels
- Diagnostics
- Feed
- Permissions
- Simulation
- Logs (recent events)

Overview includes Quick Actions buttons (restricted) for Maintenance toggle, Backup Now, Feed Test, Deploy Test, and Clear Logs.

- Panel Quick Actions include **Setup Channels** (creates category + system channels and configures them).




### Made by Rafa
