const { Events } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.MessageUpdate,
    once: false,

    async execute(oldMessage, newMessage) {
        try {
            if (!newMessage.guild) return;
            if (newMessage.author?.bot) return;
            if (oldMessage.partial) return;
            if (oldMessage.content === newMessage.content) return;

            await logger.log(newMessage.guild, 'MESSAGE_UPDATE', {
                target: newMessage.author,
                channel: newMessage.channel,
                oldContent: oldMessage.content || 'لا يوجد',
                newContent: newMessage.content || 'لا يوجد',
                messageUrl: newMessage.url
            });
        } catch (error) {
            console.error('[MESSAGE_UPDATE EVENT ERROR]', error);
        }
    },
};
