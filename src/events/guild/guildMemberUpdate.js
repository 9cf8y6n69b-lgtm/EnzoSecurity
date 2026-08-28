const { Events } = require('discord.js');
const Guild = require('../../database/models/Guild');
const staffAbuseDetector = require('../../systems/staffAbuseDetector');

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,

    async execute(oldMember, newMember) {
        try {
            if (!newMember.guild) return;
            const settings = await Guild.getOrCreate(newMember.guild.id);

            await staffAbuseDetector.handleMemberUpdate(oldMember, newMember, settings);
        } catch (error) {
            console.error('[GUILD_MEMBER_UPDATE EVENT ERROR]', error);
        }
    },
};
