const { isOwner } = require("../utils/permissions");

module.exports = {
  name: "set_deploy_channel",
  async execute(interaction, ctx) {
    const { client, db, config } = ctx;
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
    }

    let ch = interaction.options.getChannel("channel");

    // Extra safety: if Discord didn't pass the channel properly
    if (!ch) {
      const first = interaction.options.data?.find((o) => o.type === 7);
      if (first?.value) ch = await client.channels.fetch(first.value).catch(() => null);
    }

    if (!ch?.id) {
      const debug = interaction.options.data?.map((o) => ({ name: o.name, type: o.type, value: o.value })) ?? [];
      return interaction.reply({
        content:
          "❌ I didn’t receive a valid channel id from Discord.\n" +
          "Debug (send this to Dinis):\n" +
          "```json\n" + JSON.stringify(debug, null, 2) + "\n```",
        ephemeral: true,
      });
    }

    // ensure bot can post there
    const me = interaction.guild.members.me;
    const perms = me ? ch.permissionsFor(me) : null;
    if (!perms?.has(["ViewChannel", "SendMessages"])) {
      return interaction.reply({
        content:
          "⚠️ I don’t have permission to post in that channel.\n" +
          "Give me **View Channel** + **Send Messages**, then try again.",
        ephemeral: true,
      });
    }

    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    await db.setDeployChannel(interaction.guildId, ch.id);
    return interaction.reply({ content: `✅ Deployment updates channel set to <#${ch.id}>`, ephemeral: true });
  },
};
