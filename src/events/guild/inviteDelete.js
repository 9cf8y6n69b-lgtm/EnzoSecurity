const { Events } = require('discord.js');
const logger = require('../../systems/logger');
const inviteTracker = require('../../systems/inviteTracker');

module.exports = {
    name: Events.InviteDelete,
    once: false,

    async execute(invite) {
        try {
            if (!invite.guild) return;

            await inviteTracker.cacheGuildInvites(invite.guild).catch(() => null);

            const targetChannel = invite.channel ? `<#${invite.channel.id}>` : 'غير محدد';

            await logger.log(invite.guild, 'INVITE_DELETE', {
                inviteCode: invite.code,
                targetChannel: targetChannel,
                uses: invite.uses || 0
            });
        } catch (error) {
            console.error('[INVITE_DELETE EVENT ERROR]', error);
        }
    },
};
