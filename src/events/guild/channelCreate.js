const { Events, AuditLogEvent } = require('discord.js');
const logger = require('../../systems/logger');

module.exports = {
    name: Events.ChannelCreate,
    once: false,

    async execute(channel) {
        try {
            if (!channel || !channel.guild) return;

            let executor = null;
            try {
                const auditLogs = await channel.guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.ChannelCreate,
                }).catch(() => null);
                const entry = auditLogs?.entries?.find?.(e => e.target?.id === channel.id) || auditLogs?.entries?.first?.();
                if (entry && (entry.target?.id === channel.id || !entry.target)) {
                    executor = entry.executor;
                } else if (entry && !executor) {
                    executor = entry.executor;
                }
            } catch (e) {}

            const typeMap = {
                0: 'قناة نصية',
                2: 'قناة صوتية',
                4: 'فئة (Category)',
                5: 'قناة إعلانات',
                13: 'قناة منتدى (Stage)',
                15: 'قناة فورم (Forum)',
            };

            await logger.log(channel.guild, 'CHANNEL_CREATE', {
                target: channel,
                executor: executor,
                channelName: channel.name,
                channelType: typeMap[channel.type] || `نوع ${channel.type}`,
                channelMention: `<#${channel.id}>`,
                category: channel.parent ? channel.parent.name : 'بدون فئة'
            });
        } catch (error) {
            console.error('[CHANNEL_CREATE EVENT ERROR]', error);
        }
    },
};
