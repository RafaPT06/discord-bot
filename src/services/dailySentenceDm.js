const { pool } = require('../db/pool');
const { getSentenceForIndex } = require('./dailySentencePhrases');
const {
  TIME_ZONE,
  TARGET_HOUR,
  TARGET_MINUTE,
  buildSentencePayload,
  getLisbonParts,
  shouldSendNow,
  safeCodeBlock,
} = require('./dailySentenceCard');

const RELEASE_PREVIEW_KEY = 'daily-sentence-embed-refresh-v1';
const refreshLocks = new Set();

function getTargetUserId() {
  return String(process.env.DAILY_SENTENCE_USER_ID || process.env.OWNER_ID || '').trim();
}

function isHostedProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    || Boolean(process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_SERVICE_ID);
}

async function ensureDailyDmTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_sentence_dm_state (
      user_id TEXT PRIMARY KEY,
      next_index INT NOT NULL DEFAULT 0,
      last_sent_date TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_sentence_release_previews (
      release_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (release_key, user_id)
    );
  `);
}

async function getState(userId) {
  await ensureDailyDmTables();
  await pool.query(
    `INSERT INTO daily_sentence_dm_state (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );

  const result = await pool.query(
    `SELECT user_id, next_index, last_sent_date
     FROM daily_sentence_dm_state
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] || { user_id: userId, next_index: 0, last_sent_date: null };
}

async function updateState(userId, { nextIndex, lastSentDate }) {
  await pool.query(
    `UPDATE daily_sentence_dm_state
     SET next_index = $2,
         last_sent_date = $3,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, nextIndex, lastSentDate || null],
  );
}

async function hasReleasePreview(userId) {
  await ensureDailyDmTables();
  const result = await pool.query(
    `SELECT 1
     FROM daily_sentence_release_previews
     WHERE release_key = $1 AND user_id = $2
     LIMIT 1`,
    [RELEASE_PREVIEW_KEY, userId],
  );
  return Boolean(result.rows[0]);
}

async function markReleasePreview(userId) {
  await pool.query(
    `INSERT INTO daily_sentence_release_previews (release_key, user_id)
     VALUES ($1, $2)
     ON CONFLICT (release_key, user_id) DO NOTHING`,
    [RELEASE_PREVIEW_KEY, userId],
  );
}

function avatarUrl(client) {
  return client?.user?.displayAvatarURL?.({ size: 128 }) || null;
}

async function sendEntry(client, userId, entry, source) {
  const user = await client.users.fetch(userId);
  return user.send(buildSentencePayload(entry, {
    source,
    botAvatarUrl: avatarUrl(client),
  }));
}

let timer = null;
let running = false;

async function tick(client, force = false) {
  if (running) return false;
  running = true;

  try {
    const userId = getTargetUserId();
    if (!userId) return false;

    const parts = getLisbonParts();
    if (!force && !shouldSendNow()) return false;

    const state = await getState(userId);
    if (!force && state.last_sent_date === parts.dateKey) return false;

    const index = Number(state.next_index || 0);
    const entry = getSentenceForIndex(index);
    await sendEntry(client, userId, entry, 'scheduled');
    await updateState(userId, {
      nextIndex: index + 1,
      lastSentDate: parts.dateKey,
    });
    console.log(`Daily sentence DM sent to ${userId} for ${parts.dateKey}`);
    return true;
  } catch (err) {
    console.error('Daily sentence DM error:', err);
    return false;
  } finally {
    running = false;
  }
}

async function sendReleasePreviewOnce(client) {
  const userId = getTargetUserId();
  if (!userId || !isHostedProduction()) return false;
  if (await hasReleasePreview(userId)) return false;

  try {
    const state = await getState(userId);
    const index = Number(state.next_index || 0);
    const entry = getSentenceForIndex(index);
    await sendEntry(client, userId, entry, 'upgrade');

    const parts = getLisbonParts();
    await updateState(userId, {
      nextIndex: index + 1,
      lastSentDate: shouldSendNow() ? parts.dateKey : state.last_sent_date,
    });
    await markReleasePreview(userId);
    console.log(`Daily sentence upgrade preview sent to ${userId}`);
    return true;
  } catch (err) {
    console.error('Daily sentence upgrade preview error:', err);
    return false;
  }
}

async function handleCopy(interaction, index) {
  const entry = getSentenceForIndex(index);
  await interaction.reply({
    content: `**Copy phrase**\n\`\`\`text\n${safeCodeBlock(entry.quote)}\n\`\`\``,
    allowedMentions: { parse: [] },
  });
}

async function handleRefresh(interaction, client, currentIndex) {
  const userId = getTargetUserId();
  if (!userId || interaction.user?.id !== userId) {
    await interaction.reply({ content: 'This phrase control is only available to its recipient.' });
    return;
  }

  if (refreshLocks.has(userId)) {
    await interaction.reply({ content: 'A new phrase is already being prepared.' });
    return;
  }

  refreshLocks.add(userId);
  await interaction.deferUpdate();

  try {
    const state = await getState(userId);
    const nextIndex = Math.max(Number(state.next_index || 0), Number(currentIndex || 0) + 1);
    const entry = getSentenceForIndex(nextIndex);
    await interaction.editReply(buildSentencePayload(entry, {
      source: 'refresh',
      botAvatarUrl: avatarUrl(client),
    }));
    await updateState(userId, {
      nextIndex: nextIndex + 1,
      lastSentDate: state.last_sent_date,
    });
  } catch (err) {
    console.error('Daily sentence refresh error:', err);
    await interaction.followUp({ content: 'I could not prepare a new phrase right now. Please try again.' }).catch(() => {});
  } finally {
    refreshLocks.delete(userId);
  }
}

async function handleDailySentenceButton(interaction, client, parts = []) {
  const userId = getTargetUserId();
  if (!userId || interaction.user?.id !== userId) {
    await interaction.reply({ content: 'This phrase control is only available to its recipient.' });
    return;
  }

  const action = String(parts[0] || '');
  const index = Number(parts[1] || 0);
  if (action === 'copy') return handleCopy(interaction, index);
  if (action === 'refresh') return handleRefresh(interaction, client, index);
  await interaction.reply({ content: 'That phrase action is no longer available.' });
}

function installDailySentenceButtons(client) {
  if (client.__dailySentenceButtonsInstalled) return;
  client.__dailySentenceButtonsInstalled = true;
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith('daily_sentence:')) return;
    const [, ...parts] = interaction.customId.split(':');
    try {
      await handleDailySentenceButton(interaction, client, parts);
    } catch (err) {
      console.error('Daily sentence button error:', err);
      if (!interaction.isRepliable?.()) return;
      const payload = { content: 'I could not complete that phrase action right now.' };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}

function startDailySentenceDm(client) {
  if (timer) clearInterval(timer);
  installDailySentenceButtons(client);

  setTimeout(async () => {
    await sendReleasePreviewOnce(client);
    await tick(client);
  }, 15_000);

  timer = setInterval(() => tick(client).catch(() => {}), 60_000);
  console.log(`Daily sentence DM scheduler started for ${TARGET_HOUR}:${String(TARGET_MINUTE).padStart(2, '0')} ${TIME_ZONE}`);
}

module.exports = {
  startDailySentenceDm,
  tickDailySentenceDm: tick,
  handleDailySentenceButton,
  buildSentencePayload,
  sendReleasePreviewOnce,
  getLisbonParts,
  shouldSendNow,
};
