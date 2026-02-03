const { buildContentListPayload, fetchContentPage } = require("../utils/contentList");

const CRAZY_MAX_TOTAL_LINES = 25;
const CRAZY_MAX_TIMES = 3;

function getCrazyPack() {
  return [
    "That's crazy...",
    "Crazy?",
    "I was crazy once.",
    "They locked me in a room.",
    "A rubber room.",
    "A rubber room with rats.",
    "And rats make me crazy.",
  ];
}

async function handleButton(interaction, ctx) {
  const { db } = ctx;
  const parts = interaction.customId.split("_");

  // Pagination buttons for /list_compliments and /list_roasts
  if (parts[0] === "contentlist") {
    const kind = parts[1];
    const page = Math.max(1, parseInt(parts[2], 10) || 1);
    const ownerId = parts[3];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Not your buttons 🙂", ephemeral: true });
    }
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This only works in servers.", ephemeral: true });
    }
    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    const data = await fetchContentPage(db, interaction.guildId, kind, page);
    if (!data.items.length) {
      return interaction.reply({ content: "No items on that page.", ephemeral: true });
    }

    const payload = buildContentListPayload({
      kind,
      page: data.page,
      totalPages: data.totalPages,
      items: data.items,
      startIndex: data.startIndex,
      userId: ownerId,
    });

    return interaction.update(payload);
  }

  // /crazy buttons
  if (parts[0] !== "crazy") return;

  const times = Math.max(1, Math.min(parseInt(parts[2], 10) || 1, CRAZY_MAX_TIMES));
  const ownerId = parts[3];

  if (interaction.user.id !== ownerId) {
    const deny = { content: "Not your buttons 🙂" };
    if (interaction.inGuild()) deny.ephemeral = true;
    return interaction.reply(deny);
  }

  const lines = getCrazyPack();

  const ack = { content: `Sending crazy x${times} (limited).` };
  if (interaction.inGuild()) ack.ephemeral = true;
  await interaction.reply(ack);

  const outChannel = interaction.channel ?? (await interaction.user.createDM());

  let sent = 0;
  for (let t = 0; t < times; t++) {
    for (const line of lines) {
      if (sent >= CRAZY_MAX_TOTAL_LINES) return;
      await outChannel.send(line).catch(() => null);
      sent++;
    }
  }
}

module.exports = { handleButton };
