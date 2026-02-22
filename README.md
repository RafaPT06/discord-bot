# Discord Bot

Advanced multi-system Discord bot with modular architecture and PostgreSQL storage.

---

## Features

### Public
- `/help` — Interactive command menu with category tabs
- `/sys` — Public system panel (runtime, environment, DB latency)
- `/compliment`
- `/roast`
- `/mimic`
- `/cat`
- `/crazy`

---

### Feed System
- `/set_feed_channel`
- `/show_feed_channel`
- `/reset_feed_channel`
- `/feed_level`
- `/feed_test`
- `/simulate_feed` (Owner)

Multi-level event feed:
1 = Critical  
2 = System  
3 = Activity  

---

### Deploy Notifications
- `/set_deploy_channel`
- `/show_deploy_channel`
- `/reset_deploy_channel`
- `/test_deploy`

Auto-detects Railway deploys.

---

### Backup System
- `/set_backup_channel`
- `/show_backup_channel`
- `/reset_backup_channel`
- `/backup_now`

Weekly automatic backups.

---

### Roblox
- `/roblox_status`

Presence-only system (online / in-game / offline).

---

### Permissions
- `/perm_set`
- `/perm_add_role`
- `/perm_show`
- `/perm_list`
- `/perm_clear`

Granular per-command permissions.

---

### Maintenance
- `/maintenance <on|off|status>`

Hard lock mode (Owner override).

---

## Setup

1. Install dependencies:
npm install 

2. Deploy slash commands:
npm run deploy

3. Start the bot:
node index.js

---

## Environment Variables

Required:

- BOT_TOKEN
- OWNER_ID
- DATABASE_URL

Optional:

- ROBLOX_USERNAME

---

## Architecture

- Dynamic command loader
- PostgreSQL storage
- Modular services
- Embed-based UI
- Event feed framework
- Railway deploy detection
