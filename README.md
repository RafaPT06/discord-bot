# 🤖 Discord Utility Bot (Postgres + Railway)

A modular Discord bot built with **discord.js v14**, designed for server utilities, fun commands, deploy tracking, and external status monitoring (Roblox).

Built to run on **Railway** with **PostgreSQL**.

----------------------------------------------

## ✨ Features

### 🎉 Fun / Social
- `/compliment @user` — send a random compliment
- `/roast @user` — roast someone 🔥
- `/mimic <text>` — SpOnGeBoB cAsE
- `/cat` — random chaotic cat
- `/crazy [1–3]` — the crazy copypasta

---

### 📊 Status
- `/status` — uptime, ping, runtime info
- `/ping` — bot latency
- `/roblox_status` — Roblox presence (Owner only)

---

### 🗒️ Global TODOs
- `/todo_add <text>` — add a TODO
- `/todo_list [all]` — list TODOs
- `/todo_done <id>` — mark TODO as done

> Permissions: **Manage Server** or **Owner**

---

### 🛠️ Content Management
- `/add_roast`, `/add_compliment`
- `/list_roasts`, `/list_compliments` (paginated)
- `/remove_roast <id>`, `/remove_compliment <id>`

> Uses **real database IDs** (PostgreSQL)

---

### 🚀 Deploy Notifications
- `/set_deploy_channel`
- `/show_deploy_channel`
- `/reset_deploy_channel`

Automatically posts detailed deploy info on Railway:
- environment
- commit hash
- commit message
- author
- GitHub link
- Node version
- timestamp

---

### 🔔 Roblox Alerts (Owner)
- Detects Roblox presence changes (offline / online / in-game)
- Posts updates automatically
- Refresh button included

Commands:
- `/set_roblox_alert_channel`
- `/show_roblox_alert_channel`
- `/reset_roblox_alert_channel`

---

### 🚨 Error Alerts (Owner)
- Captures:
  - unhandled rejections
    - uncaught exceptions
      - Discord client errors
      - Redacts secrets automatically
      - Rate-limited to prevent spam

      Commands:
      - `/set_error_alert_channel`
      - `/show_error_alert_channel`
      - `/reset_error_alert_channel`
      - `/test_error_alert`

      ---

      ## 🧱 Tech Stack
      - **Node.js** ≥ 18
      - **discord.js v14**
      - **PostgreSQL**
      - **Railway**
      - **GitHub Deploys**

      ---

      ## 🔐 Environment Variables

      ### Required
      ```env
      BOT_TOKEN=
      APP_ID=
      OWNER_ID=
      DATABASE_URL=
