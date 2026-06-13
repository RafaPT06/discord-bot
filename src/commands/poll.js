const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const letters = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true).setMaxLength(250))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true).setMaxLength(100))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setMaxLength(100))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setMaxLength(100))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setMaxLength(100)),
  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const options = [];
    for (let i=1;i<=5;i++) {
      const v = interaction.options.getString(`option${i}`);
      if (v) options.push(v);
    }
    const embed = new EmbedBuilder().setTitle('Poll').setDescription(`**${question}**\n\n${options.map((o,i)=>`${letters[i]} ${o}`).join('\n')}`).setFooter({ text: `Created by ${interaction.user.tag}` }).setTimestamp();
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i=0;i<options.length;i++) await msg.react(letters[i]).catch(() => {});
  },
};
