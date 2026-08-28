const { Events, AuditLogEvent } = require('discord.js');
const Guild = require('../../database/models/Guild');
const antiNuke = require('../../systems/antiNuke');
const logger = require('../../systems/logger');
const { isWhitelisted } = require('../../utils/whitelist');

module.exports = {
    name: Events.GuildRoleDelete,
    once: false,

    async execute(role) {
        try {
            if (!role || !role.guild) return;
            const guild = role.guild;
            const settings = await Guild.getOrCreate(guild.id);

            let executor = null;
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.RoleDelete,
                }).catch(() => null);
                const entry = auditLogs?.entries?.find?.(e => e.target?.id === role.id) || auditLogs?.entries?.first?.();
                if (entry && (entry.target?.id === role.id || !entry.target)) {
                    executor = entry.executor;
                } else if (entry && !executor) {
                    executor = entry.executor;
                }
            } catch (e) {}

            await logger.log(guild, 'ROLE_DELETE', {
                executor: executor,
                roleName: role.name,
                roleColor: role.hexColor,
                roleId: role.id,
                memberCount: role.members?.size || 0
            });

            if (!settings.antiNuke || !settings.antiNuke.enabled) return;
            if (!executor) return;
            if (executor.id === guild.ownerId || executor.bot) return;

            const executorMember = guild.members.cache.get(executor.id) || await guild.members.fetch(executor.id).catch(() => null);
            if (isWhitelisted(executorMember || { id: executor.id, guild }, null, settings)) return;

            const thresholdExceeded = await antiNuke.checkThreshold(guild, executor.id, 'roleDelete', settings);

            if (thresholdExceeded && thresholdExceeded.exceeded) {
                await antiNuke.punish(guild, executor.id);
                await logger.log(guild, 'ANTI_NUKE', {
                    action: 'roleDelete',
                    executor,
                    role
                });
            }
        } catch (error) {
            console.error(`[ROLE_DELETE EVENT ERROR]`, error);
        }
    },
};
