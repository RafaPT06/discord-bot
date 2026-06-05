const { SlashCommandBuilder } = require('discord.js');
const facts = ['Octopuses have three hearts.', 'Bananas are berries, botanically speaking.', 'Honey never really spoils when stored properly.', 'A day on Venus is longer than a year on Venus.', 'Sharks are older than trees.'];
module.exports = { data: new SlashCommandBuilder().setName('fact').setDescription('Get a random fact.'), async execute(interaction){ return interaction.reply({ content: facts[Math.floor(Math.random()*facts.length)] }); } };
