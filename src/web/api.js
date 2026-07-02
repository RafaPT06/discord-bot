const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const { listEditImageAccessUsers, addEditImageAccessUser, removeEditImageAccessUser } = require('../services/editImageAccess');

let started = false;
const startedAt = Date.now();

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getApproxUsers(client) {
  return client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0);
}

function optionToJson(option) {
  return {
    name: option.name,
    description: option.description || '',
    type: option.type,
    required: Boolean(option.required),
    choices: Array.isArray(option.choices) ? option.choices.map((choice) => ({ name: choice.name, value: choice.value })) : [],
    options: Array.isArray(option.options) ? option.options.map(optionToJson) : [],
  };
}

const categoryRules = [
  { category: 'AI', names: ['edit_image', 'edit_image_access'] },
  { category: 'Leveling', names: ['level', 'leaderboard', 'simulate_level_up', 'feed_level'] },
  { category: 'Profiles', names: ['profile', 'achievements', 'set_card_background', 'reset_card_background'] },
  { category: 'Roblox', prefixes: ['roblox_'], names: ['presence', 'simulate_roblox', 'set_roblox_alert_channel', 'reset_roblox_alert_channel', 'show_roblox_alert_channel'] },
  { category: 'Fun', names: ['8ball', 'cat', 'compliment', 'crazy', 'fact', 'mimic', 'poll', 'quote', 'roast', 'trivia', 'would_you_rather', 'add_compliment', 'remove_compliment', 'list_compliments', 'add_roast', 'remove_roast', 'list_roasts'] },
  { category: 'Utility', names: ['help', 'ping', 'stats', 'todo_add', 'todo_done', 'todo_list', 'suggest'] },
  { category: 'Admin', prefixes: ['set_', 'reset_', 'show_', 'perm_'], names: ['setup_channels', 'permissions_check', 'starboard', 'panel', 'simulate_backup', 'simulate_deploy', 'simulate_error', 'simulate_feed', 'simulate_goodbye', 'simulate_welcome', 'test_backup', 'test_error_alert'] },
  { category: 'Owner', names: ['maintenance', 'deploy_test'] },
];

const ownerCommands = new Set(['maintenance', 'deploy_test']);
const adminCommands = new Set([
  'edit_image_access', 'setup_channels', 'panel', 'starboard', 'permissions_check',
  'perm_add_role', 'perm_clear', 'perm_list', 'perm_set', 'perm_show',
  'set_backup_channel', 'set_deploy_channel', 'set_error_alert_channel', 'set_feed_channel', 'set_goodbye_channel', 'set_level_channel', 'set_prefix', 'set_roblox_alert_channel', 'set_welcome_channel',
  'reset_backup_channel', 'reset_deploy_channel', 'reset_error_alert_channel', 'reset_feed_channel', 'reset_goodbye_channel', 'reset_level_channel', 'reset_roblox_alert_channel', 'reset_welcome_channel', 'reset_card_background',
  'show_backup_channel', 'show_deploy_channel', 'show_error_alert_channel', 'show_feed_channel', 'show_level_channel', 'show_roblox_alert_channel', 'show_welcome_channels',
  'simulate_backup', 'simulate_deploy', 'simulate_error', 'simulate_feed', 'simulate_goodbye', 'simulate_level_up', 'simulate_roblox', 'simulate_welcome', 'test_backup', 'test_error_alert'
]);

function getCommandCategory(name) {
  for (const rule of categoryRules) {
    if (rule.names?.includes(name)) return rule.category;
    if (rule.prefixes?.some((prefix) => name.startsWith(prefix))) return rule.category;
  }
  return 'Other';
}

function getCommandVisibility(name) {
  if (ownerCommands.has(name)) return 'owner';
  if (adminCommands.has(name)) return 'admin';
  return 'public';
}

function getCommands(client) {
  return Array.from(client.commands?.values?.() || [])
    .map((command) => {
      const raw = typeof command.data?.toJSON === 'function'
        ? command.data.toJSON()
        : { name: command.data?.name, description: command.data?.description };

      const name = raw.name || command.data?.name;
      if (!name) return null;

      return {
        name,
        description: raw.description || 'No description provided.',
        category: command.category || getCommandCategory(name),
        visibility: command.visibility || getCommandVisibility(name),
        dm: Boolean(raw.dm_permission),
        options: Array.isArray(raw.options) ? raw.options.map(optionToJson) : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}



async function resolveAccessUser(client, guild, userId, source, fallbackLabel = null) {
  let username = null;
  let displayName = fallbackLabel || null;
  let avatarUrl = null;

  try {
    const member = await guild.members.fetch(userId);
    username = member.user?.tag || member.user?.username || null;
    displayName = member.displayName || username || displayName;
    avatarUrl = member.user?.displayAvatarURL?.({ size: 64 }) || null;
  } catch {
    try {
      const user = await client.users.fetch(userId);
      username = user.tag || user.username || null;
      displayName = username || displayName;
      avatarUrl = user.displayAvatarURL?.({ size: 64 }) || null;
    } catch {}
  }

  return {
    userId,
    username,
    displayName: displayName || userId,
    avatarUrl,
    source,
    removable: false,
  };
}

function getBotOwnerId(client) {
  const envOwner = process.env.OWNER_ID || process.env.BOT_OWNER_ID;
  if (envOwner) return envOwner;
  const appOwner = client.application?.owner;
  if (!appOwner) return null;
  if (appOwner.id) return appOwner.id;
  if (appOwner.user?.id) return appOwner.user.id;
  return null;
}

async function listDefaultImageAccessUsers(client, guild) {
  const users = [];
  const seen = new Set();
  const ownerId = getBotOwnerId(client);

  if (ownerId) {
    const owner = await resolveAccessUser(client, guild, ownerId, 'bot_owner', 'Bot owner');
    users.push(owner);
    seen.add(ownerId);
  }

  try {
    await guild.members.fetch();
  } catch {
    // If the bot cannot fetch all members, fall back to the member cache.
  }

  const managers = guild.members.cache
    .filter((member) => {
      if (member.user?.bot) return false;
      if (seen.has(member.id)) return false;
      return member.permissions?.has(PermissionFlagsBits.ManageGuild);
    })
    .map((member) => ({
      userId: member.id,
      username: member.user?.tag || member.user?.username || null,
      displayName: member.displayName || member.user?.username || member.id,
      avatarUrl: member.user?.displayAvatarURL?.({ size: 64 }) || null,
      source: 'manage_server',
      removable: false,
    }))
    .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));

  users.push(...managers);
  return users;
}

function startBotApi(client) {
  if (started) return;
  started = true;

  const app = express();
  const port = Number(process.env.PORT || process.env.BOT_API_PORT || 3001);
  const apiToken = process.env.BOT_API_TOKEN || null;

  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.WEBSITE_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  function requireToken(req, res, next) {
    if (!apiToken) return next();
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${apiToken}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    return next();
  }

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: `${client.user?.username || 'Discord Bot'} API` });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, online: client.isReady(), updatedAt: new Date().toISOString() });
  });


  app.get('/api/commands', requireToken, (_req, res) => {
    const commands = getCommands(client);
    const categories = [...new Set(commands.map((command) => command.category))].sort();

    res.json({
      ok: true,
      botName: client.user?.username || 'Discord Bot',
      commands,
      categories,
      total: commands.length,
      updatedAt: new Date().toISOString(),
    });
  });


  app.get('/api/owner', requireToken, async (_req, res) => {
    try {
      const ownerId = getBotOwnerId(client);
      res.json({ ok: true, ownerId, updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Could not resolve bot owner.' });
    }
  });

  app.get('/api/guilds', requireToken, (_req, res) => {
    const guilds = client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon || null,
      memberCount: guild.memberCount || 0,
    }));

    res.json({
      ok: true,
      guilds,
      total: guilds.length,
      updatedAt: new Date().toISOString(),
    });
  });

  app.get('/api/guilds/:guildId/image-access', requireToken, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

      const defaultUsers = await listDefaultImageAccessUsers(client, guild);
      const defaultIds = new Set(defaultUsers.map((user) => user.userId));
      const rows = await listEditImageAccessUsers(req.params.guildId);
      const users = await Promise.all(rows
        .filter((row) => !defaultIds.has(row.user_id))
        .map(async (row) => {
          let username = null;
          let displayName = null;
          let avatarUrl = null;
          try {
            const member = await guild.members.fetch(row.user_id);
            username = member.user?.tag || member.user?.username || null;
            displayName = member.displayName || username;
            avatarUrl = member.user?.displayAvatarURL?.({ size: 64 }) || null;
          } catch {
            try {
              const user = await client.users.fetch(row.user_id);
              username = user.tag || user.username || null;
              displayName = username;
              avatarUrl = user.displayAvatarURL?.({ size: 64 }) || null;
            } catch {}
          }
          return {
            userId: row.user_id,
            username,
            displayName,
            avatarUrl,
            addedBy: row.added_by,
            createdAt: row.created_at,
            source: 'manual',
            removable: true,
          };
        }));

      res.json({
        ok: true,
        guildId: req.params.guildId,
        defaultUsers,
        users,
        total: users.length + defaultUsers.length,
        manualTotal: users.length,
        defaultTotal: defaultUsers.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Could not load image access.' });
    }
  });

  app.post('/api/guilds/:guildId/image-access', requireToken, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

      const userId = String(req.body?.userId || '').trim();
      if (!/^\d{15,25}$/.test(userId)) {
        return res.status(400).json({ ok: false, error: 'Invalid Discord user ID.' });
      }

      const defaultUsers = await listDefaultImageAccessUsers(client, guild);
      if (defaultUsers.some((user) => user.userId === userId)) {
        return res.json({
          ok: true,
          guildId: req.params.guildId,
          userId,
          defaultAccess: true,
          message: 'This user already has default access.',
          updatedAt: new Date().toISOString(),
        });
      }

      await addEditImageAccessUser(req.params.guildId, userId, req.body?.addedBy || null);
      res.json({ ok: true, guildId: req.params.guildId, userId, updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Could not add image access user.' });
    }
  });

  app.delete('/api/guilds/:guildId/image-access/:userId', requireToken, async (req, res) => {
    try {
      const guild = client.guilds.cache.get(req.params.guildId);
      if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

      const userId = String(req.params.userId || '').trim();
      if (!/^\d{15,25}$/.test(userId)) {
        return res.status(400).json({ ok: false, error: 'Invalid Discord user ID.' });
      }

      const removed = await removeEditImageAccessUser(req.params.guildId, userId);
      res.json({ ok: true, guildId: req.params.guildId, userId, removed, updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message || 'Could not remove image access user.' });
    }
  });

  app.get('/api/stats', requireToken, (_req, res) => {
    const guildCount = client.guilds.cache.size;
    const commandCount = client.commands?.size || 0;
    const userCount = getApproxUsers(client);
    const ping = Math.max(0, Math.round(client.ws.ping || 0));
    const uptimeMs = Date.now() - startedAt;

    res.json({
      ok: true,
      online: client.isReady(),
      botName: client.user?.username || 'Ruffles Bot',
      botTag: client.user?.tag || null,
      avatarUrl: client.user?.displayAvatarURL?.({ size: 128 }) || null,
      botId: client.user?.id || null,
      inviteUrl: client.user?.id ? `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands` : null,
      ping,
      servers: guildCount,
      users: userCount,
      commands: commandCount,
      uptime: formatUptime(uptimeMs),
      uptimeMs,
      updatedAt: new Date().toISOString(),
    });
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Bot API running on port ${port}`);
  });
}

module.exports = { startBotApi };
