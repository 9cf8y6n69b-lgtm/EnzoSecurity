const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');
const { isWhitelisted } = require('../utils/whitelist');

class HoneypotSystem {

    async sendHoneypotEmbed(channel) {
        if (!channel || !channel.isTextBased()) return;

        const config = require('../../config.json');
        const em = config.emojis || {};

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle(`${em.nuke || ''} قناة مصيدة (Honeypot Trap)`.trim())
            .setDescription(`${em.warning || ''} **تنبيه** أي رسالة في هذه القناة تعني **حظر دائم فوري (Instant Ban)** دون استثناء`.trim())
            .setFooter({ text: 'EnzoSecurity', iconURL: channel.guild.iconURL() });

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[HONEYPOT EMBED ERROR]', err.message);
        }
    }

    async handleMessage(message, settings) {
        if (!settings?.honeypotChannelId) return false;
        if (message.channel.id !== settings.honeypotChannelId) return false;

        const guild = message.guild;
        const author = message.author;

        if (author.id === message.client.user?.id) return false;

        if (isWhitelisted(message.member || { id: author.id, guild }, message.channel, settings)) return false;

        try {

            await message.delete().catch(() => {});

            const banReason = 'إرسال رسالة في قناة المصيدة التلقائية (Honeypot Trap Channel)';

            if (message.member && message.member.bannable) {
                await message.member.ban({ reason: banReason, deleteMessageSeconds: 86400 }).catch(() => {});
            } else {
                await guild.members.ban(author.id, { reason: banReason, deleteMessageSeconds: 86400 }).catch(() => {});
            }

            await logger.log(guild, 'HONEYPOT_TRIGGERED', {
                target: author,
                channel: message.channel,
                content: message.content || 'رسالة / مرفق',
                actionTaken: '🚨 حظر دائم فوري من السيرفر (Instant Ban)'
            });

            return true;
        } catch (err) {
            console.error('[HONEYPOT HANDLE ERROR]', err.message);
        }

        return true;
    }
}

module.exports = new HoneypotSystem();
