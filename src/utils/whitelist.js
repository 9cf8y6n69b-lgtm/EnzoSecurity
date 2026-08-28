const { getDB } = require('../database/connect');

function isWhitelisted(memberOrUser, channel, settings) {
    if (!memberOrUser) return false;

    const guild = memberOrUser.guild || null;
    const guildId = guild?.id || (typeof settings?.guildId === 'string' ? settings.guildId : null);
    const userId = memberOrUser.id;
    const channelId = channel?.id;

    if (!userId) return false;

    if (guild && userId === guild.ownerId) return true;

    if (memberOrUser.permissions && typeof memberOrUser.permissions.has === 'function') {
        if (memberOrUser.permissions.has('Administrator')) return true;
    }

    const whitelist = Array.isArray(settings?.whitelist) ? settings.whitelist : [];
    if (whitelist.includes(userId)) return true;
    if (channelId && whitelist.includes(channelId)) return true;
    if (memberOrUser.roles?.cache?.some && memberOrUser.roles.cache.some(role => whitelist.includes(role.id))) return true;

    const antiNukeWhitelist = Array.isArray(settings?.antiNuke?.whitelistedUsers) ? settings.antiNuke.whitelistedUsers : [];
    if (antiNukeWhitelist.includes(userId)) return true;

    if (guildId) {
        try {
            const db = getDB();
            const row = db.prepare('SELECT 1 FROM whitelist WHERE guildId = ? AND userId = ? LIMIT 1').get(guildId, userId);
            if (row) return true;
        } catch (e) {}
    }

    return false;
}

module.exports = { isWhitelisted };
