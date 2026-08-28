const { Events, AuditLogEvent } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.GuildRoleCreate,
    once: false,

    async execute(role) {
        try {
            if (!role || !role.guild) return;

            let executor = null;
            try {
                const auditLogs = await role.guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.RoleCreate,
                }).catch(() => null);
                const entry = auditLogs?.entries?.find?.(e => e.target?.id === role.id) || auditLogs?.entries?.first?.();
                if (entry && (entry.target?.id === role.id || !entry.target)) {
                    executor = entry.executor;
                } else if (entry && !executor) {
                    executor = entry.executor;
                }
            } catch (e) {}

            await logger.log(role.guild, 'ROLE_CREATE', {
                executor: executor,
                roleName: role.name,
                roleColor: role.hexColor,
                roleMention: `<@&${role.id}>`,
                roleId: role.id,
                mentionable: role.mentionable ? 'نعم' : 'لا',
                hoisted: role.hoist ? 'نعم' : 'لا'
            });
        } catch (error) {
            console.error('[ROLE_CREATE EVENT ERROR]', error);
        }
    },
};
