const assert = require('node:assert/strict');
const { SENTENCES, getSentenceForIndex } = require('../src/services/dailySentencePhrases');
const { buildSentencePayload, shouldSendNow } = require('../src/services/dailySentenceCard');
const { buildCopyPhraseModal, cleanPhrase } = require('../src/services/dailySentenceModal');

assert.ok(SENTENCES.length >= 60, 'The phrase library should contain enough unique entries.');

const normalizedQuotes = new Set();
const literalEmotionWords = /\b(healing|healed|pain|hurt|hope|sadness|giving up|gave up|closure|trauma|recovery|survive|forgive|broken)\b/i;
for (const [index, entry] of SENTENCES.entries()) {
  assert.equal(typeof entry.quote, 'string', `Phrase ${index + 1} must have a quote.`);
  assert.equal(typeof entry.meaning, 'string', `Phrase ${index + 1} must have a reflection.`);
  assert.ok(entry.quote.trim().length >= 16, `Phrase ${index + 1} is too short to carry the intended depth.`);
  assert.ok(entry.meaning.trim().length >= 40, `Reflection ${index + 1} needs enough room without directly decoding the phrase.`);
  assert.ok(!/part\s+\d+/i.test(entry.quote), `Phrase ${index + 1} must not use placeholder text.`);
  assert.ok(!literalEmotionWords.test(entry.quote), `Phrase ${index + 1} explains its emotion too literally.`);

  const normalized = entry.quote.trim().toLowerCase();
  assert.ok(!normalizedQuotes.has(normalized), `Phrase ${index + 1} duplicates an earlier quote.`);
  normalizedQuotes.add(normalized);
}

const firstFreshEntry = getSentenceForIndex(35);
assert.equal(firstFreshEntry.index, 35);
assert.ok(!/part\s+\d+/i.test(firstFreshEntry.quote), 'Fallback placeholder phrases must not be used.');

const wrapped = getSentenceForIndex(SENTENCES.length + 2);
assert.equal(wrapped.quote, SENTENCES[2].quote, 'The phrase library should cycle safely after the final entry.');
assert.equal(wrapped.index, SENTENCES.length + 2, 'The persistent sequence index must remain monotonic.');

const payload = buildSentencePayload(firstFreshEntry, {
  source: 'upgrade',
  botAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
});

assert.equal(payload.embeds.length, 1);
assert.equal(payload.components.length, 1);
assert.deepEqual(payload.allowedMentions, { parse: [] });

const embed = payload.embeds[0];
assert.equal(embed.title, 'Daily phrase upgraded');
assert.equal(embed.author.name, 'Meowz');
assert.equal(embed.author.icon_url, 'https://cdn.discordapp.com/embed/avatars/0.png');
assert.ok(embed.description.includes('more room'), 'The upgraded intro should emphasize open interpretation.');
assert.ok(embed.fields[0].value.startsWith('```text\n'), 'The quote must be placed in a copy-friendly code block.');
assert.ok(embed.fields[0].value.includes(firstFreshEntry.quote));
assert.equal(embed.fields[1].name, 'Reflection');
assert.equal(embed.fields[1].value, firstFreshEntry.meaning);

const row = payload.components[0];
assert.equal(row.components.length, 2);
assert.equal(row.components[0].custom_id, `daily_sentence:copy:${firstFreshEntry.index}`);
assert.equal(row.components[1].custom_id, `daily_sentence:refresh:${firstFreshEntry.index}`);
assert.equal(row.components[0].label, 'Copy phrase');
assert.equal(row.components[1].label, 'New phrase');

const modal = buildCopyPhraseModal(firstFreshEntry);
assert.equal(modal.custom_id, `daily_sentence_copy_modal:${firstFreshEntry.index}`);
assert.equal(modal.title, 'Copy phrase');
assert.equal(modal.components.length, 1);
assert.equal(modal.components[0].components.length, 1);
const modalInput = modal.components[0].components[0];
assert.equal(modalInput.custom_id, 'daily_sentence_copy_value');
assert.equal(modalInput.label, 'Press and hold, then copy');
assert.equal(modalInput.value, firstFreshEntry.quote);
assert.ok(!modalInput.value.includes('```'), 'The modal must contain only the phrase without Markdown fences.');
assert.equal(cleanPhrase('  First line\nSecond line  '), 'First line Second line');

const beforeSchedule = new Date('2026-08-04T19:00:00.000Z'); // 20:00 Lisbon in summer
const afterSchedule = new Date('2026-08-04T21:00:00.000Z'); // 22:00 Lisbon in summer
assert.equal(shouldSendNow(beforeSchedule), false);
assert.equal(shouldSendNow(afterSchedule), true);

console.log(`Daily sentence tests passed (${SENTENCES.length} subtle, open-ended phrases with a copy-only modal).`);
