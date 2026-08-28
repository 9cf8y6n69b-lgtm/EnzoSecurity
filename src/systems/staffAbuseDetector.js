const { PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const logger = require('./logger');

class StaffAbuseDetector {

    async handleMemberUpdate(oldMember, newMember, settings) {
        if (!oldMember || !newMember || !newMember.guild || !newMember.user || !newMember.roles?.cache || !oldMember.roles?.cache) return;
        if (!settings?.staffAbuseDetector?.enabled) return;

        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        if (!addedRoles || addedRoles.size === 0) return;

        const dangerousPerms = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageChannels
        ];

        let dangerousRoleAdded = null;
        let matchedPerms = [];

        addedRoles.forEach(role => {
            if (role.permissions && typeof role.permissions.has === 'function') {
                const hasDangerous = dangerousPerms.filter(perm => role.permissions.has(perm));
                if (hasDangerous.length > 0) {
                    dangerousRoleAdded = role;
                    matchedPerms = hasDangerous.map(p => p.toString());
                }
            }
        });

        if (!dangerousRoleAdded) return;

        let executor = null;
        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                limit: 6,
                type: AuditLogEvent.MemberRoleUpdate
            }).catch(() => null);
            const entry = auditLogs?.entries?.find?.(e => e.target?.id === newMember.id) || auditLogs?.entries?.first?.();
            if (entry && (entry.target?.id === newMember.id || !entry.target)) {
                executor = entry.executor;
            }
        } catch (err) {}

        if (executor && (executor.id === newMember.guild.ownerId || executor.bot)) return;

        const now = Date.now();
        const accountAgeDays = Math.floor((now - newMember.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const minAgeDays = settings.staffAbuseDetector.minAgeDays || 14;

        let abuseSeverity = 'MEDIUM';
        let alertReason = `منح رول حساس (${dangerousRoleAdded.name}) يحتوي على صلاحيات عالية بواسطة مشرف`;

        if (accountAgeDays < minAgeDays) {
            abuseSeverity = 'HIGH_CRITICAL';
            alertReason = `🚨 **تحذير خطير** منح رول أدمن حساس (${dangerousRoleAdded.name}) لحساب حديث (عمره ${accountAgeDays} أيام فقط)`;
        }

        try {
            await logger.log(newMember.guild, 'STAFF_ABUSE_ALERT', {
                target: newMember.user,
                executor: executor,
                roleName: dangerousRoleAdded.name,
                roleId: dangerousRoleAdded.id,
                accountAgeDays: accountAgeDays,
                severity: abuseSeverity,
                reason: alertReason
            });
        } catch (err) {
            console.error('[STAFF ABUSE DETECTOR ERROR]', err.message);
        }
    }
}

module.exports = new StaffAbuseDetector();
