const { request } = require('undici');

async function runTextAi(task, text, extra = '') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `${task} needs OPENAI_API_KEY to be set. Text received:\n\n${text.slice(0, 1500)}`;
  }

  const prompt = `${task}. ${extra}\n\nText:\n${text}`.trim();
  const res = await request('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise Discord assistant. Return only the useful answer.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 700,
    }),
  });
  const raw = await res.body.text();
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`AI API ${res.statusCode}: ${raw.slice(0, 300)}`);
  const json = JSON.parse(raw);
  return json?.choices?.[0]?.message?.content?.trim() || 'No response.';
}

module.exports = { runTextAi };
