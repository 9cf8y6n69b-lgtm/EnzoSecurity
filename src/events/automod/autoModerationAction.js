const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.AutoModerationActionExecution,
    once: false,

    async execute(autoMod) {
        try {
            const guild = autoMod.guild;

            const config = require('../../../config.json');
            const em = config.emojis || {};
            const embed = new EmbedBuilder()
                .setTitle(`${em.shield || ''} إشعار AutoMod`.trim())
                .setColor('Orange')
                .addFields(
                    { name: 'القاعدة (Rule)', value: autoMod.ruleTriggerType.toString(), inline: true },
                    { name: 'الإجراء (Action)', value: autoMod.action.type.toString(), inline: true },
                    { name: 'المستخدم (User)', value: `<@${autoMod.userId}>`, inline: true },
                    { name: 'المحتوى (Matched Content)', value: autoMod.matchedContent || 'N/A' }
                )
                .setTimestamp();

            await logger.log(guild, 'AUTO_MODERATION', { embed });
        } catch (error) {
            console.error(`[AUTO_MODERATION_ACTION EVENT ERROR]`, error);
        }
    },
};
