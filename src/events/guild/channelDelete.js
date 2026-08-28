const { Events, AuditLogEvent } = require('discord.js');
const Guild = require('../../database/models/Guild');
const antiNuke = require('../../systems/antiNuke');
const logger = require('../../systems/logger');
const { isWhitelisted } = require('../../utils/whitelist');

module.exports = {
    name: Events.ChannelDelete,
    once: false,

    async execute(channel) {
        try {
            if (!channel || !channel.guild) return;
            const guild = channel.guild;
            const settings = await Guild.getOrCreate(guild.id);

            let executor = null;
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    limit: 6,
                    type: AuditLogEvent.ChannelDelete,
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

            await logger.log(guild, 'CHANNEL_DELETE', {
                executor: executor,
                channelName: channel.name,
                channelType: typeMap[channel.type] || `نوع ${channel.type}`,
                channelId: channel.id,
                category: channel.parent ? channel.parent.name : 'بدون فئة'
            });

            if (!settings.antiNuke || !settings.antiNuke.enabled) return;
            if (!executor) return;
            if (executor.id === guild.ownerId || executor.bot) return;

            const executorMember = guild.members.cache.get(executor.id) || await guild.members.fetch(executor.id).catch(() => null);
            if (isWhitelisted(executorMember || { id: executor.id, guild }, channel, settings)) return;

            const thresholdExceeded = await antiNuke.checkThreshold(guild, executor.id, 'channelDelete', settings);

            if (thresholdExceeded && thresholdExceeded.exceeded) {
                await antiNuke.punish(guild, executor.id);
                await logger.log(guild, 'ANTI_NUKE', {
                    action: 'channelDelete',
                    executor,
                    channel
                });
            }
        } catch (error) {
            console.error(`[CHANNEL_DELETE EVENT ERROR]`, error);
        }
    },
};
