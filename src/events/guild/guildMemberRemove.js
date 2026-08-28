const { Events } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        try {
            const now = Date.now();
            const joinedTimestamp = member.joinedTimestamp || now;
            const joinedUnix = Math.floor(joinedTimestamp / 1000);
            const stayedDays = Math.floor((now - joinedTimestamp) / (1000 * 60 * 60 * 24));

            const rolesList = member.roles?.cache
                ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `@${r.name}`).slice(0, 8).join(', ')
                : 'بدون رولات';

            await logger.log(member.guild, 'MEMBER_LEAVE', {
                target: member.user,
                joinedUnix: joinedUnix,
                stayedDays: stayedDays,
                rolesText: rolesList || 'بدون رولات',
                memberCount: member.guild.memberCount
            });
        } catch (error) {
            console.error(`[GUILD_MEMBER_REMOVE EVENT ERROR]`, error);
        }
    },
};
