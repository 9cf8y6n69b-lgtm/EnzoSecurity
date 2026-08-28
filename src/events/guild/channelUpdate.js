const { Events, AuditLogEvent } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.ChannelUpdate,
    once: false,

    async execute(oldChannel, newChannel) {
        try {
            if (!newChannel || !newChannel.guild) return;

            let executor = null;
            try {
                const auditLogs = await newChannel.guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.ChannelUpdate,
                }).catch(() => null);
                const entry = auditLogs?.entries?.find?.(e => e.target?.id === newChannel.id) || auditLogs?.entries?.first?.();
                if (entry && (entry.target?.id === newChannel.id || !entry.target)) {
                    executor = entry.executor;
                } else if (entry && !executor) {
                    executor = entry.executor;
                }
            } catch (e) {}

            const changes = [];
            if (oldChannel.name !== newChannel.name) changes.push(`الاسم: \`${oldChannel.name}\` ← \`${newChannel.name}\``);
            if (oldChannel.topic !== newChannel.topic) changes.push(`الموضوع: تم التعديل`);
            if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`NSFW: ${newChannel.nsfw ? 'مفعل' : 'معطل'}`);
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`الوضع البطيء: ${newChannel.rateLimitPerUser}ث`);
            if (oldChannel.parentId !== newChannel.parentId) changes.push(`الفئة: تم النقل`);
            if (changes.length === 0) return;

            await logger.log(newChannel.guild, 'CHANNEL_UPDATE', {
                target: newChannel,
                executor: executor,
                channelMention: `<#${newChannel.id}>`,
                changes: changes.join('\n')
            });
        } catch (error) {
            console.error('[CHANNEL_UPDATE EVENT ERROR]', error);
        }
    },
};
