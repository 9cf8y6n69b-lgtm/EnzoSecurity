const { AuditLogEvent } = require('discord.js');
const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

async function handleBotAdd(member, settings) {
    if (!member || !member.user || !member.guild || !settings?.antiBot?.enabled) return false;
    if (!member.user.bot) return false;

    try {

        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 6,
            type: AuditLogEvent.BotAdd
        }).catch(() => null);

        const botAddLog = fetchedLogs?.entries?.find?.(e => e.target?.id === member.id) || fetchedLogs?.entries?.first?.();
        let executorId = 'غير معروف';

        if (botAddLog && (botAddLog.target?.id === member.id || !botAddLog.target)) {
            executorId = botAddLog.executor?.id || 'غير معروف';

            const executorMember = member.guild.members.cache.get(executorId) || { id: executorId, guild: member.guild };
            if (isWhitelisted(executorMember, null, settings)) {
                return false;
            }
        }

        const action = settings.antiBot.action || 'kick';
        if (action === 'ban') {
            await member.ban({ reason: `[ANTI-BOT] تم إضافة بوت بدون تصريح من الخادم بواسطة (${executorId})` }).catch(() => null);
        } else {
            await member.kick(`[ANTI-BOT] تم إضافة بوت بدون تصريح من الخادم بواسطة (${executorId})`).catch(() => null);
        }

        await logger.log(member.guild, 'ANTI_BOT', {
            target: member.user,
            executorId: executorId,
            reason: `[ANTI-BOT] إضافة بوت غير مصرح به`,
            details: { actionTaken: action === 'ban' ? 'حظر البوت' : 'طرد البوت' }
        });

        return true;
    } catch (error) {
        console.error(`[ANTI-BOT ERROR]`, error);
        return false;
    }
}

module.exports = { handleBotAdd };
