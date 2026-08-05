function cleanPhrase(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim().slice(0, 4000);
}

function buildCopyPhraseModal(entry = {}) {
  const phrase = cleanPhrase(entry.quote);
  const index = Math.max(0, Math.trunc(Number(entry.index) || 0));

  return {
    custom_id: `daily_sentence_copy_modal:${index}`,
    title: 'Copy phrase',
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: 'daily_sentence_copy_value',
            label: 'Press and hold, then copy',
            style: 2,
            value: phrase,
            required: false,
            min_length: 0,
            max_length: 4000,
          },
        ],
      },
    ],
  };
}

module.exports = { buildCopyPhraseModal, cleanPhrase };
