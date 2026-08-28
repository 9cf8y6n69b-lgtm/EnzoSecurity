const beastMode = require('./beastMode');

class AntiNuke {
    constructor() {

        this.guilds = new Map();
    }

    _initUser(guildId, userId) {
        if (!this.guilds.has(guildId)) {
            this.guilds.set(guildId, new Map());
        }
        const guildMap = this.guilds.get(guildId);
        if (!guildMap.has(userId)) {
            guildMap.set(userId, { actions: [] });
        }
        return guildMap.get(userId);
    }

    trackAction(guild, userId, actionType, guildSettings, interval = 60000) {
        const guildId = typeof guild === 'string' ? guild : (guild?.id || 'unknown');
        const userData = this._initUser(guildId, userId);
        const now = Date.now();

        userData.actions.push({ type: actionType, timestamp: now });

        userData.actions = userData.actions.filter(a => now - a.timestamp < interval);

        if (guildSettings && typeof guild !== 'string' && guild) {
            beastMode.registerThreatScore(guild, actionType.toUpperCase(), userId, guildSettings).catch(() => null);
        }

        return userData.actions.filter(a => a.type === actionType).length;
    }

    async checkThreshold(guild, userId, actionType, guildSettings) {
        const defaultThresholds = {
            channelDelete: guildSettings?.antiNuke?.channelDeleteThreshold || 3,
            roleDelete: guildSettings?.antiNuke?.roleDeleteThreshold || 3,
            ban: guildSettings?.antiNuke?.banThreshold || 5,
            kickAll: 5
        };

        const threshold = defaultThresholds[actionType] || 3;

        const count = this.trackAction(guild, userId, actionType, guildSettings);

        if (count >= threshold) {
            return { exceeded: true, count, threshold, actionType };
        }

        return { exceeded: false, count, threshold, actionType };
    }

    async punish(guild, userId) {
        if (!guild || !guild.members || typeof guild.members.fetch !== 'function' || !userId) return false;
        try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return false;

            if (member.manageable && member.roles?.cache) {
                const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id);
                if (typeof member.roles.remove === 'function') {
                    await member.roles.remove(rolesToRemove, 'Anti-Nuke quarantine').catch(() => null);
                }
            }

            try {
                if (typeof member.send === 'function') {
                    await member.send(`🚨 **تم تفعيل Anti-Nuke** 🚨\nتم سحب رولاتك وتجريدك في **${guild.name}** بسبب تجاوز الحد المسموح للأفعال الحساسة.`).catch(() => null);
                }
            } catch (err) {

            }

            console.log(`[ANTI-NUKE] Quarantined user ${userId} in guild ${guild.id}`);
            return true;
        } catch (err) {
            console.error(`Failed to punish user ${userId} in Anti-Nuke:`, err);
            return false;
        }
    }
}

module.exports = new AntiNuke();
