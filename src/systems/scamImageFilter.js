const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');
const warningSystem = require('./warningSystem');

class ScamImageFilter {
    constructor() {
        this.scamKeywords = [
            'mrbeast', 'mr beast', 'mrbeast giveaway', 'mrbeast nitro',
            'scan qr code', 'scan qr', 'scan to receive nitro', 'scan to claim',
            'free 100$', 'crypto giveaway', 'binance giveaway', 'tesla giveaway',
            'claim 1000$', 'claim free nitro', 'crypto-promo', 'claim your gift',
            'steam gift', 'discord nitro gift', 'free robux', 'solana airdrop'
        ];
    }

    async handleMessage(message, settings) {
        if (!settings?.scamImageFilter?.enabled) return false;
        if (!message || !message.member || !message.guild) return false;

        if (isWhitelisted(message.member, message.channel, settings)) return false;

        const content = message.content ? message.content.toLowerCase() : '';
        const attachmentUrls = message.attachments ? message.attachments.map(a => (a.name || '') + ' ' + (a.url || '')).join(' ').toLowerCase() : '';
        const embedUrls = message.embeds ? message.embeds.map(e => (e.url || '') + ' ' + (e.title || '') + ' ' + (e.description || '')).join(' ').toLowerCase() : '';

        const fullText = `${content} ${attachmentUrls} ${embedUrls}`;
        let matchedReason = null;

        if (fullText.includes('mrbeast') || fullText.includes('mr beast')) {
            if (fullText.includes('giveaway') || fullText.includes('nitro') || fullText.includes('crypto') || fullText.includes('claim') || fullText.includes('gift') || fullText.includes('qr')) {
                matchedReason = 'احتيال وسكام مستر بيست الوهمي (MrBeast Scam)';
            }
        }

        if (!matchedReason && (fullText.includes('scan qr') || fullText.includes('scan to receive') || fullText.includes('scan to claim'))) {
            matchedReason = 'احتيال كود QR الوهمي للنيترو (Nitro QR Code Scam)';
        }

        if (!matchedReason && (fullText.includes('steam gift') || fullText.includes('free robux') || fullText.includes('solana airdrop'))) {
            matchedReason = 'صورة احتيال هدايا وهمية (Fake Gift Scam)';
        }

        if (!matchedReason && (fullText.includes('crypto giveaway') || fullText.includes('claim 1000$') || fullText.includes('binance giveaway') || fullText.includes('tesla giveaway'))) {
            matchedReason = 'صورة / GIF احتيال مالي وهمي (Crypto Scam Image)';
        }

        if (matchedReason) {
            try {

                if (typeof message.delete === 'function') {
                    await message.delete().catch(() => {});
                }

                const botExecutorId = message.client?.user?.id || 'SYSTEM';
                const warnResult = await warningSystem.addWarning(
                    message.guild,
                    message.member,
                    botExecutorId,
                    matchedReason
                );

                const warnMsg = message.channel?.send ? await message.channel.send({
                    content: `🖼️ <@${message.author?.id}> تم مسح صورتك الاحتيالية وتطبيق **${warnResult.escalationSummary}**`
                }).catch(() => null) : null;

                if (warnMsg) {
                    setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
                }

                await logger.log(message.guild, 'SCAM_IMAGE_DETECTED', {
                    target: message.author,
                    channel: message.channel,
                    reason: matchedReason,
                    actionTaken: warnResult.escalationSummary,
                    content: message.content || 'صورة / GIF / مرفق'
                });

                return true;
            } catch (err) {
                console.error('[SCAM IMAGE FILTER ERROR]', err.message);
            }
        }

        return false;
    }
}

module.exports = new ScamImageFilter();
