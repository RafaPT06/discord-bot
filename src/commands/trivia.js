const { SlashCommandBuilder } = require('discord.js');
const qs = [{q:'What planet is known as the Red Planet?',a:'Mars'}, {q:'How many sides does a hexagon have?',a:'6'}, {q:'What does CPU stand for?',a:'Central Processing Unit'}, {q:'What year did Minecraft officially release?',a:'2011'}];
module.exports = { data: new SlashCommandBuilder().setName('trivia').setDescription('Get a trivia question.'), async execute(interaction){ const item=qs[Math.floor(Math.random()*qs.length)]; return interaction.reply({ content: `**Trivia:** ${item.q}\n||Answer: ${item.a}||` }); } };
