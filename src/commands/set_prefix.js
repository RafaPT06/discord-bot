const { SlashCommandBuilder } = require("discord.js");
const { setPrefix } = require("../services/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_prefix")
    .setDescription("Set the bot text prefix. Owner only.")
    .addStringOption((o) => o.setName("prefix").setDescription("New prefix, for example .").setRequired(true).setMaxLength(5)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (interaction.user.id !== process.env.OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
    const prefix = interaction.options.getString("prefix").trim();
    if (!prefix || prefix.length > 5 || /\s/.test(prefix)) return interaction.reply({ content: "Invalid prefix.", ephemeral: true });
    await setPrefix(interaction.guildId, prefix, interaction.user.id);
    return interaction.reply({ content: `Prefix set to \`${prefix}\`.`, ephemeral: true });
  },
};
