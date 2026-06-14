const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const prompts = ['Have unlimited money but no internet, or unlimited internet but no money?', 'Always be 10 minutes late, or always be 20 minutes early?', 'Only play one game forever, or never play the same game twice?', 'Be able to fly, or become invisible?', 'Lose your phone, or lose your wallet?'];
module.exports = { data: new SlashCommandBuilder().setName('would_you_rather').setDescription('Get a would-you-rather question.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ), async execute(interaction){ return interaction.reply({ content: prompts[Math.floor(Math.random()*prompts.length)] }); } };
