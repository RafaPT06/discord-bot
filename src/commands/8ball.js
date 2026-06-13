const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const answers = ['Yes.', 'No.', 'Maybe.', 'Probably.', 'Probably not.', 'Ask again later.', 'Definitely.', 'I doubt it.'];
module.exports = { data: new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8-ball.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).addStringOption(o=>o.setName('question').setDescription('Your question').setRequired(true)), async execute(interaction){ const q=interaction.options.getString('question', true); return interaction.reply({ content: `**Q:** ${q}\n**A:** ${answers[Math.floor(Math.random()*answers.length)]}` }); } };
