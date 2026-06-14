const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { runTextAi } = require('../services/textAi');
module.exports = { data: new SlashCommandBuilder().setName('explain').setDescription('Explain something simply.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).addStringOption(o=>o.setName('text').setDescription('What to explain').setRequired(true).setMaxLength(3500)), async execute(interaction){ await interaction.deferReply(); const out=await runTextAi('Explain this simply and clearly', interaction.options.getString('text', true)); return interaction.editReply(out.slice(0,1900)); } };
