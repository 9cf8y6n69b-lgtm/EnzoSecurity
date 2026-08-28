const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

class AutoMod {

    async handleMessage(message, settings) {
        if (!settings?.autoMod?.enabled) return;
        if (!message.member) return;

        if (isWhitelisted(message.member, message.channel, settings)) return;

        const content = message.content.toLowerCase();
        const { bannedWords, antiInvite, antiLink } = settings.autoMod;
        const config = require('../../config.json');
        const em = config.emojis || {};

        let triggeredReason = null;

        if (antiInvite && (content.includes('discord.gg/') || content.includes('discord.com/invite/'))) {
            triggeredReason = 'إرسال رابط دعوة ديسكورد (Anti-Invite)';
        }

        if (!triggeredReason && antiLink && (content.includes('http://') || content.includes('https://'))) {
            triggeredReason = 'إرسال رابط غير مسموح (Anti-Link)';
        }

        if (!triggeredReason && Array.isArray(bannedWords) && bannedWords.length > 0) {
            for (const word of bannedWords) {
                if (word.trim() && content.includes(word.trim().toLowerCase())) {
                    triggeredReason = `استخدام كلمة محظورة (${word})`;
                    break;
                }
            }
        }

        if (triggeredReason) {
            try {
                await message.delete().catch(() => {});
                const warningMsg = await message.channel.send({
                    content: `${em.warning || ''} <@${message.author.id}> تم حذف رسالتك بسبب **${triggeredReason}**`
                }).catch(() => null);

                if (warningMsg) {
                    setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
                }

                await logger.log(message.guild, 'WARN', {
                    target: message.author,
                    executor: 'Auto-Mod',
                    reason: triggeredReason
                });
            } catch (err) {
                console.error('[AUTO-MOD ERROR]', err.message);
            }
        }
    }
}

module.exports = new AutoMod();
