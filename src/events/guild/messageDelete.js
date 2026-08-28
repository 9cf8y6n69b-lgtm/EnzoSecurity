const { Events } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.MessageDelete,
    once: false,

    async execute(message) {
        try {
            if (!message.guild) return;
            if (message.author?.bot) return;
            if (!message.content && message.attachments.size === 0) return;

            const attachments = message.attachments.size > 0
                ? message.attachments.map(a => a.url).slice(0, 3).join('\n')
                : null;

            await logger.log(message.guild, 'MESSAGE_DELETE', {
                target: message.author,
                channel: message.channel,
                content: message.content || 'لا يوجد محتوى نصي',
                attachments: attachments
            });
        } catch (error) {
            console.error('[MESSAGE_DELETE EVENT ERROR]', error);
        }
    },
};
