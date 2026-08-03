const HTTP_URL_PATTERN = /https?:\/\/[^\s<]+/gi;
const TRAILING_URL_PUNCTUATION = /[\])}>.,!?;:'"]+$/;
const DIRECT_MEDIA_EXTENSION = /\.(?:gif|gifv|png|jpe?g|webp|avif|mp4|webm|mov)(?:$|[?#])/i;
const MEDIA_EMBED_TYPES = new Set(['gifv', 'video', 'image']);
const EMBED_WAIT_MS = 2200;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHttpUrls(content) {
  return (String(content || '').match(HTTP_URL_PATTERN) || [])
    .map((value) => value.replace(TRAILING_URL_PUNCTUATION, ''))
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    });
}

function hostnameMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch {
    return '';
  }
}

function isKnownMediaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const pathname = url.pathname.toLowerCase();

  if (DIRECT_MEDIA_EXTENSION.test(`${pathname}${url.search}`)) return true;

  if (hostnameMatches(hostname, 'klipy.com')) {
    return pathname.startsWith('/gifs/');
  }

  if (hostnameMatches(hostname, 'tenor.com')) {
    return pathname.startsWith('/view/') || DIRECT_MEDIA_EXTENSION.test(`${pathname}${url.search}`);
  }

  if (hostnameMatches(hostname, 'giphy.com')) {
    return pathname.startsWith('/gifs/') || pathname.startsWith('/media/') || DIRECT_MEDIA_EXTENSION.test(`${pathname}${url.search}`);
  }

  if (hostname === 'cdn.discordapp.com' || hostname === 'media.discordapp.net') {
    return pathname.startsWith('/attachments/') && DIRECT_MEDIA_EXTENSION.test(`${pathname}${url.search}`);
  }

  if (hostname === 'i.imgur.com') return DIRECT_MEDIA_EXTENSION.test(`${pathname}${url.search}`);

  return false;
}

function isMediaEmbed(embed) {
  const type = String(embed?.type || embed?.data?.type || '').toLowerCase();
  if (MEDIA_EMBED_TYPES.has(type)) return true;
  return Boolean(embed?.video?.url || embed?.data?.video?.url);
}

function embedSourceUrls(embed) {
  return [
    embed?.url,
    embed?.data?.url,
    embed?.video?.url,
    embed?.data?.video?.url,
  ].map(canonicalUrl).filter(Boolean);
}

function hasMatchingMediaEmbed(value, embeds = []) {
  const target = canonicalUrl(value);
  if (!target) return false;
  return embeds.some((embed) => isMediaEmbed(embed) && embedSourceUrls(embed).includes(target));
}

async function refetchMessage(message) {
  try {
    if (typeof message?.fetch === 'function') return await message.fetch(true);
    if (message?.channel?.messages?.fetch && message?.id) {
      return await message.channel.messages.fetch(message.id, { cache: false, force: true });
    }
  } catch {
    // Keep the original message and apply the normal unsafe-link fallback.
  }
  return message;
}

async function hasUnsafeExternalLink(message, { waitMs = EMBED_WAIT_MS } = {}) {
  const urls = extractHttpUrls(message?.content || '');
  if (!urls.length) return false;

  const unresolved = urls.filter((value) => !isKnownMediaUrl(value));
  if (!unresolved.length) return false;

  let embeds = Array.isArray(message?.embeds) ? message.embeds : [];
  let unsafe = unresolved.filter((value) => !hasMatchingMediaEmbed(value, embeds));
  if (!unsafe.length) return false;

  // Discord link previews can arrive shortly after MessageCreate. Let Discord do
  // the unfurling rather than fetching arbitrary user URLs from the bot process.
  await delay(waitMs);
  const refreshed = await refetchMessage(message);
  embeds = Array.isArray(refreshed?.embeds) ? refreshed.embeds : [];
  unsafe = unresolved.filter((value) => !hasMatchingMediaEmbed(value, embeds));
  return unsafe.length > 0;
}

module.exports = {
  EMBED_WAIT_MS,
  extractHttpUrls,
  isKnownMediaUrl,
  isMediaEmbed,
  hasMatchingMediaEmbed,
  hasUnsafeExternalLink,
};
