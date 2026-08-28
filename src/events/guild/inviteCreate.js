const { Events } = require('discord.js');
const logger = require('../../systems/logger');
const inviteTracker = require('../../systems/inviteTracker');

module.exports = {
    name: Events.InviteCreate,
    once: false,

    async execute(invite) {
        try {
            if (!invite.guild) return;

            await inviteTracker.cacheGuildInvites(invite.guild).catch(() => null);

            const maxAge = invite.maxAge ? (invite.maxAge === 0 ? 'دائم (بدون انتهاء)' : `${Math.floor(invite.maxAge / 3600)} ساعة`) : 'غير محدد';
            const maxUses = invite.maxUses ? `${invite.maxUses} استخدام` : 'غير محدود';
            const targetChannel = invite.channel ? `<#${invite.channel.id}>` : 'غير محدد';

            await logger.log(invite.guild, 'INVITE_CREATE', {
                executor: invite.inviter,
                inviteCode: invite.code,
                inviteUrl: `https://discord.gg/${invite.code}`,
                targetChannel: targetChannel,
                maxAge: maxAge,
                maxUses: maxUses,
                temporary: invite.temporary ? 'نعم (مؤقتة)' : 'لا (دائمة)'
            });
        } catch (error) {
            console.error('[INVITE_CREATE EVENT ERROR]', error);
        }
    },
};
