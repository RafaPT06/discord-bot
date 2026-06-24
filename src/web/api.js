const express = require('express');

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


function startBotApi(client) {
  if (started) return;
  started = true;

  const app = express();
  const port = Number(process.env.PORT || process.env.BOT_API_PORT || 3001);
  const apiToken = process.env.BOT_API_TOKEN || null;

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.WEBSITE_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
