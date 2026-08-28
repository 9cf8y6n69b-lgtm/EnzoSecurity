const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

function sanitizePhishContent(str) {
    if (typeof str !== 'string') return '';

    let cleaned = str.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u00AD]/g, '').normalize('NFKC');

    const homoglyphMap = {
        '\u0430': 'a', '\u0431': 'b', '\u0441': 'c', '\u0434': 'd', '\u0435': 'e',
        '\u0456': 'i', '\u0458': 'j', '\u043E': 'o', '\u0440': 'p', '\u0455': 's',
        '\u0442': 't', '\u0443': 'y', '\u0445': 'x', '\u044A': 'b', '\u043D': 'h',
        '\u0406': 'I', '\u041E': 'O', '\u0410': 'A', '\u0421': 'C', '\u0415': 'E',
        '\u0420': 'P', '\u0422': 'T', '\u0423': 'Y', '\u0425': 'X',
        '\u03BF': 'o', '\u03B1': 'a', '\u03B5': 'e', '\u03B9': 'i', '\u03BA': 'k',
        '\u03BD': 'v', '\u03C1': 'p', '\u03C4': 't'
    };
    cleaned = cleaned.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, ch => homoglyphMap[ch] || ch);
    return cleaned;
}

class PhishingScanner {
    constructor() {

        this.phishingKeywords = [
            'discord-gift', 'discoord-gift', 'dlscord.gift', 'discord-nitro.gift', 'discordapp.click',
            'discord-app.info', 'discord-free.com', 'discorrd.com', 'discort.gift',
            'steam-gift.ru', 'free-nitro.ru', 'discordgift.ru', 'discord-gift.me',
            'steamcommunity-nitro.com', 'nitro-discord.app', 'gift-discord.org',
            'discord-promo.com', 'free-discord-nitro.com', 'discordn.gift',
            'discorl.gift', 'disclord.gift', 'discord-airdrop.com', 'steam-nitro.ru',
            'discord-claim.com', 'discordn.com', 'discord-get.com', 'discord-app.net'
        ];
    }

    async handleMessage(message, settings) {
        if (!settings?.phishingScanner?.enabled) return false;
        if (!message || !message.content || !message.member) return false;

        if (isWhitelisted(message.member, message.channel, settings)) return false;

        const rawContent = message.content;
        const cleanedContent = sanitizePhishContent(rawContent).toLowerCase();
        let matchedPattern = null;

        const markdownUrlRegex = /\[.*?\]\((https?:\/\/[^\s\)]+)\)/gi;
        const markdownUrls = [];
        let mdMatch;
        while ((mdMatch = markdownUrlRegex.exec(cleanedContent)) !== null) {
            markdownUrls.push(mdMatch[1]);
        }

        const genericUrlRegex = /https?:\/\/[^\s\)]+/gi;
        const rawUrls = cleanedContent.match(genericUrlRegex) || [];
        const allUrls = Array.from(new Set([...markdownUrls, ...rawUrls]));

        const fakeGiftRegex = /https?:\/\/(?:www\.)?([a-z0-9-]*dis[a-z0-9-]*|[a-z0-9-]*d[a-z0-9-]*(?:cord|scord)[a-z0-9-]*)\.(gift|click|info|ru|me|app|xyz|tech|top|site|club|online|com|org|net|cc|io)\/[^\s]*/i;

        for (const url of allUrls) {

            for (const kw of this.phishingKeywords) {
                if (url.includes(kw)) {
                    matchedPattern = url;
                    break;
                }
            }
            if (matchedPattern) break;

            const match = url.match(fakeGiftRegex);
            if (match) {
                const isLegitDiscord = url.startsWith('https://discord.gift/') ||
                                       url.startsWith('https://discord.com/gifts/') ||
                                       url.startsWith('https://discordapp.com/gifts/') ||
                                       url.startsWith('https://discord.com/') ||
                                       url.startsWith('https://discord.gg/');
                if (!isLegitDiscord) {
                    matchedPattern = match[0];
                    break;
                }
            }
        }

        if (!matchedPattern) {
            for (const kw of this.phishingKeywords) {
                if (cleanedContent.includes(kw)) {
                    matchedPattern = kw;
                    break;
                }
            }
        }

        if (matchedPattern) {
            try {
                if (typeof message.delete === 'function') {
                    await message.delete().catch(() => {});
                }

                const warnMsg = message.channel?.send ? await message.channel.send({
                    content: `🚨 <@${message.author?.id}> تم حذف رسالتك تلقائياً لاحتوائها على **رابط تصيّد / نيترو مزيّف مشبوه (Phishing Link)**`
                }).catch(() => null) : null;

                if (warnMsg) {
                    setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
                }

                await logger.log(message.guild, 'PHISHING_DETECTED', {
                    target: message.author,
                    channel: message.channel,
                    matchedUrl: matchedPattern,
                    content: message.content
                });

                return true;
            } catch (err) {
                console.error('[PHISHING SCANNER ERROR]', err.message);
            }
        }

        return false;
    }
}

module.exports = new PhishingScanner();
