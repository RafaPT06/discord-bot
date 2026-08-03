const assert = require('node:assert/strict');
const { SENTENCES, getSentenceForIndex } = require('../src/services/dailySentencePhrases');
const { buildSentencePayload, shouldSendNow } = require('../src/services/dailySentenceDm');

assert.ok(SENTENCES.length >= 60, 'The phrase library should contain enough unique entries.');

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

const embed = payload.embeds[0].toJSON();
assert.equal(embed.title, 'Daily phrase upgraded');
assert.equal(embed.author.name, 'Meowz');
assert.ok(embed.fields[0].value.startsWith('```text\n'), 'The quote must be placed in a copy-friendly code block.');
assert.ok(embed.fields[0].value.includes(firstFreshEntry.quote));
assert.equal(embed.fields[1].name, 'Meaning');
assert.equal(embed.fields[1].value, firstFreshEntry.meaning);

const row = payload.components[0].toJSON();
assert.equal(row.components.length, 2);
assert.equal(row.components[0].custom_id, `daily_sentence:copy:${firstFreshEntry.index}`);
assert.equal(row.components[1].custom_id, `daily_sentence:refresh:${firstFreshEntry.index}`);
assert.equal(row.components[0].label, 'Copy phrase');
assert.equal(row.components[1].label, 'New phrase');

const beforeSchedule = new Date('2026-08-04T19:00:00.000Z'); // 20:00 Lisbon in summer
const afterSchedule = new Date('2026-08-04T21:00:00.000Z'); // 22:00 Lisbon in summer
assert.equal(shouldSendNow(beforeSchedule), false);
assert.equal(shouldSendNow(afterSchedule), true);

console.log(`Daily sentence tests passed (${SENTENCES.length} phrases).`);
