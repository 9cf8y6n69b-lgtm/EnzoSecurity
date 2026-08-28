const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

class TokenLeakFilter {
    constructor() {

        this.discordTokenRegex = /(?:M|N|O|m|n|o)[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,38}/g;

        this.openaiKeyRegex = /sk-(?:proj-)?[A-Za-z0-9_-]{32,60}/g;

        this.githubTokenRegex = /ghp_[A-Za-z0-9]{36}/g;
    }

    async handleMessage(message, settings) {
        if (!settings?.tokenLeakFilter?.enabled) return false;
        if (!message || !message.content || !message.member) return false;

        if (isWhitelisted(message.member, message.channel, settings)) return false;

        const content = typeof message.content === 'string'
            ? message.content.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u00AD]/g, '').normalize('NFKC')
            : '';
        let tokenType = null;

        this.discordTokenRegex.lastIndex = 0;
        this.openaiKeyRegex.lastIndex = 0;
        this.githubTokenRegex.lastIndex = 0;

        if (this.discordTokenRegex.test(content)) {
            tokenType = 'توكن بوت ديسكورد (Discord Bot Token)';
        } else if (this.openaiKeyRegex.test(content)) {
            tokenType = 'مفتاح API خاص بـ OpenAI';
        } else if (this.githubTokenRegex.test(content)) {
            tokenType = 'توكن شخصي لـ GitHub (Personal Access Token)';
        }

        this.discordTokenRegex.lastIndex = 0;
        this.openaiKeyRegex.lastIndex = 0;
        this.githubTokenRegex.lastIndex = 0;

        if (tokenType) {
            try {

                await message.delete().catch(() => {});

                await message.author.send({
                    content: `⚠️ **تنبيه أمان عاجل من EnzoSecurity** ⚠️\n\nتم حذف رسالتك فورياً في سيرفر **${message.guild.name}** لأنها احتوت على **${tokenType}** حساس\nيرجى إعادة توليد التوكن (Reset Token) فوراً لحماية حسابك والبوت الخاص بك من الاستغلال الخارجي`
                }).catch(() => null);

                const channelNotice = await message.channel.send({
                    content: `🔑 <@${message.author.id}> تم مسح رسالتك فورياً لاحتوائها على **توكن / مفتاح حساس سرّي** وحمايتك من الاستغلال`
                }).catch(() => null);

                if (channelNotice) {
                    setTimeout(() => channelNotice.delete().catch(() => {}), 8000);
                }

                await logger.log(message.guild, 'TOKEN_LEAK_DETECTED', {
                    target: message.author,
                    channel: message.channel,
                    tokenType: tokenType
                });

                return true;
            } catch (err) {
                console.error('[TOKEN LEAK FILTER ERROR]', err.message);
            }
        }

        return false;
    }
}

module.exports = new TokenLeakFilter();
