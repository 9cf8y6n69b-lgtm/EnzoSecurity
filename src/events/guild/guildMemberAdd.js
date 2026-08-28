const { Events } = require('discord.js');
const Guild = require('../../database/models/Guild');
const antiRaid = require('../../systems/antiRaid');
const antiBot = require('../../systems/antiBot');
const antiAlt = require('../../systems/antiAlt');
const verification = require('../../systems/verification');
const logger = require('../../systems/logger');
const inviteTracker = require('../../systems/inviteTracker');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const settings = await Guild.getOrCreate(member.guild.id);

            if (member.user.bot) {
                const isBotIntercepted = await antiBot.handleBotAdd(member, settings);
                if (isBotIntercepted) return;
                await logger.log(member.guild, 'MEMBER_JOIN', { target: member.user, isBot: true });
                return;
            }

            if (settings.antiAlt && settings.antiAlt.enabled) {
                const isAltHandled = await antiAlt.handleAltJoin(member, settings);
                if (isAltHandled) return;
            }

            if (settings.antiRaid && settings.antiRaid.enabled) {
                const isRaid = await antiRaid.handleJoin(member, settings);
                if (isRaid) {
                    console.log(`[ANTI-RAID] Raid detected in guild ${member.guild.id}`);
                    return;
                }
            }

            const inviteData = await inviteTracker.findInviter(member);

            if (settings.verifyChannelId) {
                await verification.sendVerification(member, settings);
            }

            const now = Date.now();
            const accountAgeDays = Math.floor((now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
            const createdUnix = Math.floor(member.user.createdTimestamp / 1000);

            await logger.log(member.guild, 'MEMBER_JOIN', {
                target: member.user,
                inviter: inviteData.inviter,
                inviteCode: inviteData.code,
                inviteUses: inviteData.uses,
                accountAgeDays: accountAgeDays,
                createdUnix: createdUnix,
                memberCount: member.guild.memberCount
            });

        } catch (error) {
            console.error(`[GUILD_MEMBER_ADD EVENT ERROR]`, error);
        }
    },
};
