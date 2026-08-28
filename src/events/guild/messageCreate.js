const { Events } = require('discord.js');
const Guild = require('../../database/models/Guild');
const honeypot = require('../../systems/honeypot');
const tokenLeakFilter = require('../../systems/tokenLeakFilter');
const phishingScanner = require('../../systems/phishingScanner');
const scamImageFilter = require('../../systems/scamImageFilter');
const antiSpam = require('../../systems/antiSpam');
const autoMod = require('../../systems/autoMod');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        try {
            if (!message.guild || message.author.id === message.client.user?.id) return;

            const settings = await Guild.getOrCreate(message.guild.id);

            const isHoneypot = await honeypot.handleMessage(message, settings);
            if (isHoneypot) return;

            if (message.author.bot) return;

            const tokenIntercepted = await tokenLeakFilter.handleMessage(message, settings);
            if (tokenIntercepted) return;

            const phishingIntercepted = await phishingScanner.handleMessage(message, settings);
            if (phishingIntercepted) return;

            const scamIntercepted = await scamImageFilter.handleMessage(message, settings);
            if (scamIntercepted) return;

            await autoMod.handleMessage(message, settings);

            if (settings.antiSpam && settings.antiSpam.enabled) {
                const spamAction = await antiSpam.handleMessage(message, settings);

                if (spamAction && spamAction.isSpam) {
                    await logger.log(message.guild, 'ANTI_SPAM', {
                        target: message.author,
                        content: message.content,
                        actionTaken: 'تم حذف الرسالة',
                        reason: spamAction.reason
                    });
                }
            }
        } catch (error) {
            console.error(`[MESSAGE_CREATE EVENT ERROR]`, error);
        }
    },
};
