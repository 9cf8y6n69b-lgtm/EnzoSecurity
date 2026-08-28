const { Events, AuditLogEvent } = require('discord.js');
const Guild = require('../../database/models/Guild');
const antiNuke = require('../../systems/antiNuke');
const logger = require('../../systems/logger');
const { isWhitelisted } = require('../../utils/whitelist');

module.exports = {
    name: Events.GuildBanAdd,
    once: false,

    async execute(ban) {
        try {
            if (!ban || !ban.guild || !ban.user) return;
            const guild = ban.guild;
            const settings = await Guild.getOrCreate(guild.id);

            await logger.log(guild, 'MEMBER_BAN_ADD', { user: ban.user, reason: ban.reason });

            if (!settings.antiNuke || !settings.antiNuke.enabled) return;

            const auditLogs = await guild.fetchAuditLogs({
                limit: 6,
                type: AuditLogEvent.MemberBanAdd,
            }).catch(() => null);

            const auditEntry = auditLogs?.entries?.find?.(e => e.target?.id === ban.user.id) || auditLogs?.entries?.first?.();
            if (!auditEntry) return;

            const { executor, target } = auditEntry;
            if (target && target.id && target.id !== ban.user.id) return;
            if (!executor || executor.id === guild.ownerId || executor.bot) return;

            const executorMember = guild.members.cache.get(executor.id) || await guild.members.fetch(executor.id).catch(() => null);
            if (isWhitelisted(executorMember || { id: executor.id, guild }, null, settings)) return;

            const thresholdExceeded = await antiNuke.checkThreshold(guild, executor.id, 'ban', settings);

            if (thresholdExceeded && thresholdExceeded.exceeded) {
                await antiNuke.punish(guild, executor.id);
                await logger.log(guild, 'ANTI_NUKE', {
                    action: 'memberBanAdd',
                    executor,
                    user: ban.user
                });
            }
        } catch (error) {
            console.error(`[GUILD_BAN_ADD EVENT ERROR]`, error);
        }
    },
};
