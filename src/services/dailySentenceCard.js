const { BRAND_COLORS } = require('../utils/brandColors');

const TIME_ZONE = 'Europe/Lisbon';
const TARGET_HOUR = 21;
const TARGET_MINUTE = 30;

function getLisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function shouldSendNow(now = new Date()) {
  const { hour, minute } = getLisbonParts(now);
  return hour > TARGET_HOUR || (hour === TARGET_HOUR && minute >= TARGET_MINUTE);
}

function safeCodeBlock(text) {
  return String(text || '').replace(/```/g, "''' ").trim();
}

function sourceTitle(source) {
  if (source === 'upgrade') return 'Daily phrase upgraded';
  if (source === 'refresh') return 'A fresh phrase';
  return 'A thought for today';
}

function sourceIntro(source) {
  if (source === 'upgrade') {
    return 'The daily phrase now leaves more room between the words and what they might mean.';
  }
  if (source === 'refresh') return 'Another line to sit with for a while.';
  return 'Read it once now. It may sound different later.';
}

function buildSentencePayload(entry, { source = 'scheduled', botAvatarUrl = null } = {}) {
  const quote = safeCodeBlock(entry.quote);
  const reflection = String(entry.meaning || '').trim() || 'There may be more than one way to read it.';
  const embed = {
    color: BRAND_COLORS.primary,
    title: sourceTitle(source),
    description: sourceIntro(source),
    fields: [
      {
        name: 'Phrase',
        value: `\`\`\`text\n${quote}\n\`\`\``,
        inline: false,
      },
      {
        name: 'Reflection',
        value: reflection.slice(0, 1024),
        inline: false,
      },
    ],
    footer: {
      text: `Daily at ${TARGET_HOUR}:${String(TARGET_MINUTE).padStart(2, '0')} · ${TIME_ZONE} · Refresh for another`,
    },
    timestamp: new Date().toISOString(),
  };

  if (botAvatarUrl) embed.author = { name: 'Meowz', icon_url: botAvatarUrl };

  return {
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            custom_id: `daily_sentence:copy:${entry.index}`,
            label: 'Copy phrase',
            emoji: { name: '📋' },
            style: 2,
          },
          {
            type: 2,
            custom_id: `daily_sentence:refresh:${entry.index}`,
            label: 'New phrase',
            emoji: { name: '🔄' },
            style: 1,
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };
}

module.exports = {
  TIME_ZONE,
  TARGET_HOUR,
  TARGET_MINUTE,
  buildSentencePayload,
  getLisbonParts,
  shouldSendNow,
  safeCodeBlock,
};
