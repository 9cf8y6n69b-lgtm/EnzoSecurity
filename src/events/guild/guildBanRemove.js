const { Events } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.GuildBanRemove,
    once: false,

    async execute(ban) {
        try {
            await logger.log(ban.guild, 'MEMBER_UNBAN', {
                target: ban.user,
                reason: ban.reason || 'لم يتم تقديم سبب'
            });
        } catch (error) {
            console.error('[GUILD_BAN_REMOVE EVENT ERROR]', error);
        }
    },
};
