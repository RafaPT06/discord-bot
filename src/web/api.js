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
