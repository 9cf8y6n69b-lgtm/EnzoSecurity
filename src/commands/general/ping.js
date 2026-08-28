const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('فحص سرعة استجابة البوت (Ping)'),

    async execute(interaction) {
        try {
            const sent = await interaction.reply({ embeds: [infoEmbed('جاري الفحص...')], fetchReply: true });
            const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            let color = '#00ff00';
            if (botLatency > 200 || apiLatency > 200) color = '#ffff00';
            if (botLatency > 500 || apiLatency > 500) color = '#ff0000';

            const embed = infoEmbed(`**بونج! 🏓**\nسرعة البوت: \`${botLatency}ms\`\nسرعة الـ API: \`${apiLatency}ms\``);
            embed.setColor(color);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error(`Ping Error: ${error.message}`);
            if (!interaction.replied) await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء فحص البنج.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
