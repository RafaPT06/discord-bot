const assert = require('node:assert/strict');
const {
  extractHttpUrls,
  isKnownMediaUrl,
  hasMatchingMediaEmbed,
  hasUnsafeExternalLink,
} = require('../src/services/mediaLinkSafety');

async function run() {
  const klipyUrls = [
    'https://klipy.com/gifs/orv-omniscient-readers-viewpoint-10',
    'https://klipy.com/gifs/omniscient-readers-viewpoint-kim-dokja-2',
    'https://klipy.com/gifs/han-sooyoung-orv-1',
    'https://klipy.com/gifs/valorant-meme-valorant-sage',
  ];

  klipyUrls.forEach((url) => assert.equal(isKnownMediaUrl(url), true, `${url} should be treated as media`));
  assert.equal(isKnownMediaUrl('https://example.com/page'), false);
  assert.equal(isKnownMediaUrl('https://cdn.example.com/video.mp4'), true);
  assert.equal(isKnownMediaUrl('https://media.discordapp.net/attachments/1/2/file.webp?width=600'), true);

  assert.deepEqual(
    extractHttpUrls('watch https://example.com/video.mp4, then https://example.com/page.'),
    ['https://example.com/video.mp4', 'https://example.com/page'],
  );

  const videoEmbed = { type: 'video', url: 'https://video.example/watch/123', video: { url: 'https://cdn.example/123.mp4' } };
  assert.equal(hasMatchingMediaEmbed('https://video.example/watch/123', [videoEmbed]), true);
  assert.equal(hasMatchingMediaEmbed('https://video.example/watch/999', [videoEmbed]), false);

  assert.equal(await hasUnsafeExternalLink({ content: klipyUrls[0], embeds: [] }, { waitMs: 0 }), false);
  assert.equal(await hasUnsafeExternalLink({
    content: 'https://video.example/watch/123',
    embeds: [videoEmbed],
  }, { waitMs: 0 }), false);

  assert.equal(await hasUnsafeExternalLink({
    content: 'https://example.com/page',
    embeds: [],
    fetch: async function fetch() { return this; },
  }, { waitMs: 0 }), true);

  assert.equal(await hasUnsafeExternalLink({
    content: `${klipyUrls[1]} https://example.com/page`,
    embeds: [],
    fetch: async function fetch() { return this; },
  }, { waitMs: 0 }), true);

  console.log('Media link moderation tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
