const { SlashCommandBuilder } = require('discord.js');
const { runTextAi } = require('../services/textAi');
module.exports = { data: new SlashCommandBuilder().setName('summarize').setDescription('Summarize text.').addStringOption(o=>o.setName('text').setDescription('Text to summarize').setRequired(true).setMaxLength(3500)), async execute(interaction){ await interaction.deferReply(); const out=await runTextAi('Summarize this clearly in a few bullets', interaction.options.getString('text', true)); return interaction.editReply(out.slice(0,1900)); } };
