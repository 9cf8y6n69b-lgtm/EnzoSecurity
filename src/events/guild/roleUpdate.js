const { Events, AuditLogEvent } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.GuildRoleUpdate,
    once: false,

    async execute(oldRole, newRole) {
        try {
            if (!newRole || !newRole.guild) return;

            let executor = null;
            try {
                const auditLogs = await newRole.guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.RoleUpdate,
                }).catch(() => null);
                const entry = auditLogs?.entries?.find?.(e => e.target?.id === newRole.id) || auditLogs?.entries?.first?.();
                if (entry && (entry.target?.id === newRole.id || !entry.target)) {
                    executor = entry.executor;
                } else if (entry && !executor) {
                    executor = entry.executor;
                }
            } catch (e) {}

            const changes = [];
            if (oldRole.name !== newRole.name) changes.push(`الاسم: \`${oldRole.name}\` ← \`${newRole.name}\``);
            if (oldRole.hexColor !== newRole.hexColor) changes.push(`اللون: \`${oldRole.hexColor}\` ← \`${newRole.hexColor}\``);
            if (oldRole.hoist !== newRole.hoist) changes.push(`مميز: ${newRole.hoist ? 'نعم' : 'لا'}`);
            if (oldRole.mentionable !== newRole.mentionable) changes.push(`منشنابل: ${newRole.mentionable ? 'نعم' : 'لا'}`);
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`الصلاحيات: تم التعديل`);
            if (changes.length === 0) return;

            await logger.log(newRole.guild, 'ROLE_UPDATE', {
                executor: executor,
                roleName: newRole.name,
                roleMention: `<@&${newRole.id}>`,
                changes: changes.join('\n')
            });
        } catch (error) {
            console.error('[ROLE_UPDATE EVENT ERROR]', error);
        }
    },
};
