const { SlashCommandBuilder } = require("discord.js");
const { setDotStatus, refreshPresenceRotation, getPresenceState } = require("../services/presenceManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("presence")
        .setDescription("Owner: control bot presence (dot status + activity refresh).")
        .addSubcommand((s) =>
            s
                .setName("status")
                .setDescription("Set the bot dot status.")
                .addStringOption((o) =>
                    o
                        .setName("value")
                        .setDescription("online / idle / dnd / invisible")
                        .setRequired(true)
                        .addChoices(
                            { name: "online", value: "online" },
                            { name: "idle", value: "idle" },
                            { name: "dnd", value: "dnd" },
                            { name: "invisible", value: "invisible" }
                        )
                )
        )
        .addSubcommand((s) =>
            s
                .setName("refresh")
                .setDescription("Refresh activity text now (uptime / updating).")
        )
        .addSubcommand((s) =>
            s
                .setName("show")
                .setDescription("Show current presence settings.")
        ),
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === "status") {
            const value = interaction.options.getString("value", true);
            const st = await setDotStatus(client, value);
            return interaction.reply({ content: `OK. Status set to **${st}**.`, ephemeral: true });
        }

        if (sub === "refresh") {
            await refreshPresenceRotation(client);
            return interaction.reply({ content: "OK. Presence refreshed.", ephemeral: true });
        }

        if (sub === "show") {
            const s = getPresenceState();
            return interaction.reply({
                content: [
                    "Presence",
                    `Status: ${s.status}`,
                    `Bubble text: ${s.bubbleText || "Automatic rotation"}`,
                    `Interval: ${Math.round(s.intervalMs / 1000)}s`,
                    `Running: ${s.running}`,
                ].join("\n"),
                ephemeral: false,
            });
        }

        return interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
    },
};
