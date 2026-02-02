const { handleButton } = require("./buttons");

// Commands
const help = require("../commands/help");
const status = require("../commands/status");
const ping = require("../commands/ping");
const crazy = require("../commands/crazy");
const compliment = require("../commands/compliment");
const cat = require("../commands/cat");
const mimic = require("../commands/mimic");
const roast = require("../commands/roast");

const setDeployChannel = require("../commands/set_deploy_channel");
const showDeployChannel = require("../commands/show_deploy_channel");
const resetDeployChannel = require("../commands/reset_deploy_channel");

const todoAdd = require("../commands/todo_add");
const todoList = require("../commands/todo_list");
const todoDone = require("../commands/todo_done");

const addCompliment = require("../commands/add_compliment");
const addRoast = require("../commands/add_roast");
const listCompliments = require("../commands/list_compliments");
const listRoasts = require("../commands/list_roasts");

const COMMANDS = new Map(
  [
    help,
    status,
    ping,
    crazy,
    compliment,
    cat,
    mimic,
    roast,

    setDeployChannel,
    showDeployChannel,
    resetDeployChannel,

    todoAdd,
    todoList,
    todoDone,

    addCompliment,
    addRoast,
    listCompliments,
    listRoasts,
  ].map((c) => [c.name, c])
);

async function handleInteraction(interaction, ctx) {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = COMMANDS.get(interaction.commandName);
      if (!cmd) {
        return interaction.reply({ content: "❌ Unknown command.", ephemeral: true }).catch(() => null);
      }
      return await cmd.execute(interaction, ctx);
    }

    if (interaction.isButton()) {
      return await handleButton(interaction, ctx);
    }
  } catch (err) {
    console.error("Interaction handler error:", err);
    // Try to reply once; if already replied, ignore.
    const payload = { content: "❌ Something went wrong. Check logs.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}

module.exports = { handleInteraction };
