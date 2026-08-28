const logger = require('./logger');

const threatScores = new Map();

async function registerThreatScore(guild, actionType, executorId, settings) {
    if (!guild || !guild.id || !settings || !settings.beastMode || !settings.beastMode.enabled) return false;

    const guildId = guild.id;
    const now = Date.now();

    if (settings.beastMode.active && settings.beastMode.activeUntil > now) {

        await enforceBeastPunishment(guild, executorId, actionType, settings);
        return true;
    } else if (settings.beastMode.active && settings.beastMode.activeUntil <= now) {

        settings.beastMode.active = false;
        threatScores.delete(guildId);
        await settings.save();
        await logger.log(guild, 'BEAST_MODE_DEACTIVATED', {
            reason: 'انتهت مدة وضع الوحش (ساعة واحدة) ورجع النظام للمراقبة العادية.'
        });
    }

    const scoreMap = {
        'BAN': 10,
        'KICK': 5,
        'CHANNEL_DELETE': 10,
        'ROLE_DELETE': 10,
        'BOT_ADD': 15,
        'MASS_JOIN': 10
    };
    const points = scoreMap[actionType] || 5;

    let tracker = threatScores.get(guildId);
    if (!tracker || (now - tracker.windowStart > 600000)) {
        tracker = { score: 0, windowStart: now };
    }

    tracker.score += points;
    threatScores.set(guildId, tracker);

    const limit = settings.beastMode.scoreLimit || 25;

    if (tracker.score >= limit && !settings.beastMode.active) {
        settings.beastMode.active = true;
        settings.beastMode.activeUntil = now + 3600000;
        tracker.score = 0;
        await settings.save();

        await logger.log(guild, 'BEAST_MODE_ACTIVATED', {
            reason: `🦁 تم تفعيل وضع الوحش (Beast Mode) تلقائياً لمدة ساعة بسبب ارتفاع نقاط التهديد إلى (${tracker.score}/${limit})!`
        });

        await enforceBeastPunishment(guild, executorId, actionType, settings);
        return true;
    }

    return false;
}

async function enforceBeastPunishment(guild, executorId, actionType, settings) {
    if (!guild || !guild.members || typeof guild.members.fetch !== 'function' || !executorId || executorId === guild.ownerId) return;

    try {
        const member = await guild.members.fetch(executorId).catch(() => null);
        if (!member || !member.user) return;

        const action = settings?.beastMode?.action || 'clear_roles';

        if (action === 'clear_roles') {
            if (member.roles && typeof member.roles.set === 'function') {
                await member.roles.set([]).catch(() => null);
            }
            await logger.log(guild, 'BEAST_PUNISHMENT', {
                target: member.user,
                reason: `🦁 [BEAST MODE] سحب جميع الرولات فورياً لقيام العضو بفعل مشبوه (${actionType}) أثناء تفعيل وضع الوحش.`
            });
        } else if (action === 'ban') {
            if (typeof member.ban === 'function') {
                await member.ban({ reason: `🦁 [BEAST MODE] حظر فورى للقيام بفعل مشبوه أثناء تفعيل وضع الوحش.` }).catch(() => null);
            }
            await logger.log(guild, 'BEAST_PUNISHMENT', {
                target: member.user,
                reason: `🦁 [BEAST MODE] حظر العضو فورياً للقيام بفعل مشبوه (${actionType}) أثناء تفعيل وضع الوحش.`
            });
        } else if (action === 'kick') {
            if (typeof member.kick === 'function') {
                await member.kick(`🦁 [BEAST MODE] طرد فورى للقيام بفعل مشبوه أثناء تفعيل وضع الوحش.`).catch(() => null);
            }
            await logger.log(guild, 'BEAST_PUNISHMENT', {
                target: member.user,
                reason: `🦁 [BEAST MODE] طرد العضو فورياً للقيام بفعل مشبوه (${actionType}) أثناء تفعيل وضع الوحش.`
            });
        }
    } catch (err) {
        console.error(`[BEAST MODE PUNISHMENT ERROR]`, err);
    }
}

module.exports = { registerThreatScore, enforceBeastPunishment };
