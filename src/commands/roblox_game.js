const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require("discord.js");
const { request } = require('undici');
async function getJson(url){ const res=await request(url); const text=await res.body.text(); if(res.statusCode<200||res.statusCode>=300) throw new Error(`Roblox API ${res.statusCode}: ${text.slice(0,200)}`); return JSON.parse(text); }
module.exports = { data: new SlashCommandBuilder().setName('roblox_game').setDescription('Show Roblox game stats by universe ID.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ).addStringOption(o=>o.setName('universe_id').setDescription('Roblox universe ID').setRequired(true)), async execute(interaction){ await interaction.deferReply(); const id=interaction.options.getString('universe_id', true); const data=await getJson(`https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(id)}`); const g=data?.data?.[0]; if(!g) return interaction.editReply('Game not found.'); const icon=await getJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(id)}&size=150x150&format=Png&isCircular=false`).catch(()=>null); const embed=new EmbedBuilder().setTitle(g.name || 'Roblox Game').setDescription(g.description?.slice(0,500) || 'No description.').addFields({name:'Playing',value:String(g.playing ?? 'n/a'),inline:true},{name:'Visits',value:String(g.visits ?? 'n/a'),inline:true},{name:'Favorites',value:String(g.favoritedCount ?? 'n/a'),inline:true},{name:'Creator',value:g.creator?.name || 'n/a',inline:true}).setTimestamp(); const img=icon?.data?.[0]?.imageUrl; if(img) embed.setThumbnail(img); return interaction.editReply({embeds:[embed]}); } };
