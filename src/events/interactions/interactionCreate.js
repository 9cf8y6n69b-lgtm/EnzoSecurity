const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const verification = require('../../systems/verification');

module.exports = {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`[COMMAND ERROR] Failed to execute ${interaction.commandName}:`, error);
                    const config = require('../../../config.json');
                    const em = config.emojis || {};
                    const embed = new EmbedBuilder()
                        .setColor('Red')
                        .setDescription(`${em.error || ''} **حدث خطأ أثناء تنفيذ الأمر.**`.trim());

                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                    } else {
                        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                    }
                }
            } else if (interaction.isButton()) {
                if (interaction.customId === 'verify_button') {
                    await verification.handleVerification(interaction);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'verify_modal') {
                    await verification.processVerification(interaction);
                }
            }
        } catch (error) {
            console.error(`[INTERACTION EVENT ERROR]`, error);
        }
    },
};
