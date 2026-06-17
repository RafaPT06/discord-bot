function getOpenAiError(statusCode, raw) {
  try {
    const json = JSON.parse(raw);
    return json?.error?.message || raw.slice(0, 300);
  } catch {
    return raw.slice(0, 300);
  }
}

function safeExtFromContentType(contentType) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

async function downloadDiscordImage(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Could not download Discord image (${res.status}).`);

  const contentType = res.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) throw new Error("Discord attachment is not an image.");

  const arrayBuffer = await res.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: contentType });
  const ext = safeExtFromContentType(contentType);
  return { blob, filename: `input.${ext}` };
}

async function editImageWithOpenAI({ imageUrl, prompt, size = "1024x1024" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in Railway variables.");
  if (!imageUrl) throw new Error("Missing image URL.");
  if (!prompt) throw new Error("Missing edit prompt.");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini";
  const { blob, filename } = await downloadDiscordImage(imageUrl);

  const form = new FormData();
  form.append("model", model);
  form.append("image[]", blob, filename);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("n", "1");
  form.append("output_format", "png");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI image edit failed (${res.status}): ${getOpenAiError(res.status, raw)}`);
  }

  const json = JSON.parse(raw);
  const item = json?.data?.[0];
  if (!item) throw new Error("OpenAI returned no image.");

  if (item.b64_json) {
    return {
      buffer: Buffer.from(item.b64_json, "base64"),
      revisedPrompt: item.revised_prompt || null,
    };
  }

  if (item.url) {
    return {
      url: item.url,
      revisedPrompt: item.revised_prompt || null,
    };
  }

  throw new Error("OpenAI returned an unsupported image response.");
}

module.exports = { editImageWithOpenAI };
