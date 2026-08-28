const { Message, PermissionsBitField } = require('discord.js');
const { isWhitelisted } = require('../utils/whitelist');

class AntiSpam {
    constructor() {

        this.users = new Map();
    }

    async handleMessage(message, guildSettings) {

        if (!message || !message.author || message.author.bot || !message.member) return { isSpam: false };

        if (isWhitelisted(message.member, message.channel, guildSettings)) {
            return { isSpam: false };
        }

        const userId = message.author.id;
        const now = Date.now();
        const config = require('../../config.json');
        const em = config.emojis || {};

        if (!this.users.has(userId)) {
            this.users.set(userId, { messages: [], warnings: 0 });
        }
        const userData = this.users.get(userId);

        const messageLimit = guildSettings?.antiSpam?.messageThreshold || 5;
        const timeWindow = guildSettings?.antiSpam?.messageInterval || 5000;
        const duplicateLimit = guildSettings?.antiSpam?.duplicateThreshold || 3;
        const mentionLimit = guildSettings?.antiSpam?.mentionThreshold || 5;

        userData.messages.push({ content: message.content || '', timestamp: now });

        userData.messages = userData.messages.filter(m => now - m.timestamp < timeWindow);

        let isSpam = false;
        let spamReason = '';

        const mentions = (message.mentions?.users?.size || 0) + (message.mentions?.roles?.size || 0);
        if (mentions >= mentionLimit || message.mentions?.everyone) {
            isSpam = true;
            spamReason = 'منشن مكثف مسطح';
        }

        if (!isSpam && userData.messages.length >= messageLimit) {
            isSpam = true;
            spamReason = 'تكرار وإرسال رسائل متتالية بسرعة';
        }

        if (!isSpam) {
            const duplicates = userData.messages.filter(m => m.content === message.content).length;
            if (duplicates >= duplicateLimit) {
                isSpam = true;
                spamReason = 'تكرار نفس الرسالة عدة مرات';
            }
        }

        if (isSpam) {
            userData.warnings += 1;
            const warnings = userData.warnings;
            let action = '';

            try {
                if (warnings === 1) {
                    if (message.deletable) await message.delete().catch(() => {});
                    action = 'WARN_AND_DELETE';
                    const reply = await message.channel.send({
                        content: `${em.warning || ''} <@${userId}> توقف عن التكرار والإغراق تحذير (1/4)`
                    }).catch(() => null);
                    if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
                }
                else if (warnings === 2) {
                    if (message.deletable) await message.delete().catch(() => {});
                    if (message.member.moderatable) {
                        await message.member.timeout(5 * 60 * 1000, 'Anti-Spam Muted 5 minutes').catch(() => {});
                        action = 'TIMEOUT_5M';
                    }
                }
                else if (warnings === 3) {
                    if (message.member.kickable) {
                        await message.member.kick('Anti-Spam Kicked').catch(() => {});
                        action = 'KICK';
                    }
                }
                else if (warnings >= 4) {
                    if (message.member.bannable) {
                        await message.member.ban({ reason: 'Anti-Spam Banned' }).catch(() => {});
                        action = 'BAN';
                    }
                    this.clearUser(userId);
                }
            } catch (err) {
                console.error(`Failed to punish user ${userId} for spam:`, err);
                action = 'ERROR_PUNISHING';
            }

            return { isSpam: true, action, reason: spamReason };
        }

        return { isSpam: false };
    }

    clearUser(userId) {
        this.users.delete(userId);
    }
}

module.exports = new AntiSpam();
