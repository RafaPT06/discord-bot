const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { runTextAi } = require('../services/textAi');
module.exports = { data: new SlashCommandBuilder().setName('improve').setDescription('Improve text before sending.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).addStringOption(o=>o.setName('text').setDescription('Text to improve').setRequired(true).setMaxLength(3500)).addStringOption(o=>o.setName('tone').setDescription('Tone, e.g. casual, polite, professional')), async execute(interaction){ await interaction.deferReply({ ephemeral:false }); const tone=interaction.options.getString('tone')||'natural'; const out=await runTextAi('Rewrite and improve this text', interaction.options.getString('text', true), `Tone: ${tone}. Keep the meaning.`); return interaction.editReply(out.slice(0,1900)); } };
