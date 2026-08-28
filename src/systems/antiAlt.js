const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

async function handleAltJoin(member, settings) {
    if (!member || !member.user || !member.guild || !settings?.antiAlt?.enabled) return false;
    if (member.user.bot) return false;

    if (isWhitelisted(member, null, settings)) return false;

    try {
        const minAgeDays = settings.antiAlt.minAgeDays || 7;
        const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

        if (accountAgeDays < minAgeDays) {
            const action = settings.antiAlt.action || 'kick';
            const reason = `[ANTI-ALT] عمر الحساب حديث جداً (${accountAgeDays} يوم - الحد الأدنى: ${minAgeDays} يوم)`;

            if (action === 'ban') {
                await member.ban({ reason }).catch(() => null);
            } else {
                await member.kick(reason).catch(() => null);
            }

            await logger.log(member.guild, 'ANTI_ALT', {
                target: member.user,
                reason: reason,
                details: { accountAgeDays, minAgeDays, actionTaken: action === 'ban' ? 'حظر الحساب' : 'طرد الحساب' }
            });

            return true;
        }

        return false;
    } catch (error) {
        console.error(`[ANTI-ALT ERROR]`, error);
        return false;
    }
}

module.exports = { handleAltJoin };
