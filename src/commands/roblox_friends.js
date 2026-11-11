const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType, MessageFlags } = require('discord.js');
const { request } = require('undici');
const { resolveUsername } = require('../services/robloxApi');

const PAGE_SIZE = 5;
async function json(url, diagnostic = false) {
  const res = await request(url, { headersTimeout: 8000, bodyTimeout: 8000, maxRedirections: 0 });
  try {
    if (diagnostic) console.info('[Roblox Friends] Friends API HTTP status:', res.statusCode);
    if (res.statusCode === 403 || res.statusCode === 401) return { restricted: true };
    if (res.statusCode === 404) return { missing: true };
    if (res.statusCode < 200 || res.statusCode >= 300) throw new Error('Roblox unavailable');
    const data = await res.body.json();
    if (diagnostic) console.info('[Roblox Friends] Response shape:', Array.isArray(data?.data) ? 'data-array' : Array.isArray(data) ? 'array' : 'unexpected', 'count:', Array.isArray(data?.data) ? data.data.length : 'n/a');
    return data;
  } finally { await res.body.dump().catch(() => {}); }
}
async function loadThumbnails(friends) {
  const thumbnails = new Map();
  const ids = friends.map(friend => friend.id);
  for (let index = 0; index < ids.length; index += 100) {
    try {
      const batch = ids.slice(index, index + 100);
      const data = await json(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${batch.join(',')}&size=150x150&format=Png&isCircular=false`);
      for (const item of data.data || []) {
        if (item.state === 'Completed' && /^https:\/\//.test(item.imageUrl || '')) {
          thumbnails.set(Number(item.targetId), item.imageUrl);
        }
      }
    } catch {
      // Roblox thumbnail failures must not prevent friends from being shown.
    }
  }
  return thumbnails;
}
function render(user, friends, page, thumbnails) {
  const pages = Math.max(1, Math.ceil(friends.length / PAGE_SIZE));
  const subset = friends.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const header = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle(`Friends (${friends.length}) — @${user.name}`)
    .setURL(`https://www.roblox.com/users/${user.userId}/profile`)
    .setDescription(`Showing publicly available friends · Page ${page + 1} of ${pages}`);
  const embeds = [header, ...subset.map(friend => {
    const id = Number(friend.id);
    const name = String(friend.name || 'Unknown').slice(0, 50);
    const display = String(friend.displayName || name).slice(0, 50);
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '');
    const safeDisplay = display.replace(/[\\r\\n]/g, ' ').slice(0, 50);
    const embed = new EmbedBuilder()
      .setColor(0x151a2b)
      .setAuthor({ name: `${safeDisplay} (@${safeName})`, url: `https://www.roblox.com/users/${id}/profile` })
      .setDescription(`User ID: \`${id}\``);
    const image = thumbnails.get(id);
    if (image) embed.setThumbnail(image);
    return embed;
  })];
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('page').setLabel(`${page + 1} / ${pages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page + 1 >= pages),
  );
  return { embeds, components: pages > 1 ? [row] : [], allowedMentions: { parse: [] } };
}

module.exports = {
  data: new SlashCommandBuilder().setName('roblox_friends')
    .setDescription('Show a Roblox users publicly available friends.')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true).setMaxLength(20)),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const username = interaction.options.getString('username', true).trim();
      console.info('[Roblox Friends] Lookup started');
      const user = await resolveUsername(username);
      console.info('[Roblox Friends] Username resolved');
      const response = await json(`https://friends.roblox.com/v1/users/${user.userId}/friends`, true);
      if (response.restricted || response.missing || !Array.isArray(response.data)) {
        console.warn('[Roblox Friends] Lookup unavailable:', response.restricted ? 'access-denied' : response.missing ? 'not-found' : 'unexpected-response');
        return interaction.editReply({ content: 'This friends list is not publicly available through Roblox. Meowz respects Roblox privacy settings.' });
      }
      const friends = response.data.filter(f => Number.isSafeInteger(f.id) && f.id > 0).slice(0, 500);
      console.info('[Roblox Friends] Public friends returned:', friends.length);
      if (!friends.length) return interaction.editReply({ content: `No publicly available friends found for @${user.name}.` });
      const thumbnails = await loadThumbnails(friends.slice(0, PAGE_SIZE));
      const message = await interaction.editReply(render(user, friends, 0, thumbnails));
      let page = 0;
      const collector = message.createMessageComponentCollector({ time: 120000 });
      collector.on('collect', async (press) => {
        if (press.user.id !== interaction.user.id) {
          return press.reply({ content: 'Only the command requester can change pages.', flags: MessageFlags.Ephemeral });
        }
        page = Math.max(0, Math.min(Math.ceil(friends.length / PAGE_SIZE) - 1, page + (press.customId === 'next' ? 1 : -1)));
        await press.deferUpdate();
        const pageFriends = friends.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).filter(friend => !thumbnails.has(friend.id));
        const loaded = await loadThumbnails(pageFriends);
        for (const [id, url] of loaded) thumbnails.set(id, url);
        return interaction.editReply(render(user, friends, page, thumbnails));
      });
      collector.on('end', () => interaction.editReply({ components: [] }).catch(() => {}));
    } catch (error) {
      console.error('[Roblox Friends] Lookup failed:', error?.name || 'Error', error?.code || 'no-code', String(error?.message || '').slice(0, 120).replace(/https?:\\/\\/\\S+/g, '[url]'));
      const message = /not found/i.test(error.message) ? 'Roblox user not found.' : 'Roblox friends are unavailable right now. Please try again later.';
      return interaction.editReply({ content: message, embeds: [], components: [] });
    }
  },
};
