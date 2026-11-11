const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType, MessageFlags } = require('discord.js');
const { request } = require('undici');
const { resolveUsername } = require('../services/robloxApi');

const PAGE_SIZE = 5;
async function json(url) {
  const res = await request(url, { headersTimeout: 8000, bodyTimeout: 8000, maxRedirections: 0 });
  try {
    if (res.statusCode === 403 || res.statusCode === 401) return { restricted: true };
    if (res.statusCode === 404) return { missing: true };
    if (res.statusCode < 200 || res.statusCode >= 300) throw new Error('Roblox unavailable');
    return await res.body.json();
  } finally { await res.body.dump().catch(() => {}); }
}
function render(user, friends, page, thumbnails) {
  const pages = Math.max(1, Math.ceil(friends.length / PAGE_SIZE));
  const subset = friends.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const description = subset.map((friend) => {
    const id = Number(friend.id);
    const name = String(friend.name || 'Unknown').slice(0, 50);
    const display = String(friend.displayName || name).slice(0, 50);
    return `**[${display}](https://www.roblox.com/users/${id}/profile)** (@${name.replace(/[`*_~|>]/g, '')})\nID: \`${id}\``;
  }).join('\n\n');
  const embed = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle(`Friends (${friends.length}) — @${user.name}`)
    .setURL(`https://www.roblox.com/users/${user.userId}/profile`)
    .setDescription(description || 'No friends available.')
    .setFooter({ text: `Page ${page + 1} of ${pages} · Public Roblox data only` });
  if (subset.length === 1 && thumbnails.get(subset[0].id)) embed.setThumbnail(thumbnails.get(subset[0].id));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page + 1 >= pages),
  );
  return { embeds: [embed], components: pages > 1 ? [row] : [] };
}
module.exports = {
  data: new SlashCommandBuilder().setName('roblox_friends')
    .setDescription('Show a Roblox user’s publicly available friends.')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption(o => o.setName('username').setDescription('Roblox username').setRequired(true).setMaxLength(20)),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const username = interaction.options.getString('username', true).trim();
      const user = await resolveUsername(username);
      const response = await json(`https://friends.roblox.com/v1/users/${user.userId}/friends`);
      if (response.restricted || response.missing || !Array.isArray(response.data)) {
        return interaction.editReply({ content: 'This friends list is not publicly available through Roblox. Meowz respects Roblox privacy settings.' });
      }
      const friends = response.data.filter(f => Number.isSafeInteger(f.id) && f.id > 0).slice(0, 500);
      if (!friends.length) return interaction.editReply({ content: `No publicly available friends found for @${user.name}.` });
      const thumbnails = new Map();
      const message = await interaction.editReply(render(user, friends, 0, thumbnails));
      let page = 0;
      const collector = message.createMessageComponentCollector({ time: 120000 });
      collector.on('collect', async (press) => {
        if (press.user.id !== interaction.user.id) {
          return press.reply({ content: 'Only the command requester can change pages.', flags: MessageFlags.Ephemeral });
        }
        page = Math.max(0, Math.min(Math.ceil(friends.length / PAGE_SIZE) - 1, page + (press.customId === 'next' ? 1 : -1)));
        return press.update(render(user, friends, page, thumbnails));
      });
      collector.on('end', () => interaction.editReply({ components: [] }).catch(() => {}));
    } catch (error) {
      const message = /not found/i.test(error.message) ? 'Roblox user not found.' : 'Roblox friends are unavailable right now. Please try again later.';
      return interaction.editReply({ content: message, embeds: [], components: [] });
    }
  },
};
