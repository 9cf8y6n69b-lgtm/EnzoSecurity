const { getDB } = require('../connect');

function safeJSONParse(value, fallback) {
    if (typeof value !== 'string') return value || fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeJSONStringify(value, fallback = '{}') {
    try {
        return JSON.stringify(value);
    } catch {
        return typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
    }
}

class Guild {

    static _parseRow(row) {
        if (!row) return null;
        const parsed = {
            guildId: row.guildId,
            logChannelId: row.logChannelId,
            modLogChannelId: row.modLogChannelId,
            securityLogChannelId: row.securityLogChannelId,
            automodLogChannelId: row.automodLogChannelId,
            joinLeaveLogChannelId: row.joinLeaveLogChannelId,
            verifyChannelId: row.verifyChannelId,
            verifiedRoleId: row.verifiedRoleId,
            honeypotChannelId: row.honeypotChannelId,
            webhookUrl: row.webhookUrl,
            antiRaid: safeJSONParse(row.antiRaid, { enabled: false, joinThreshold: 10, joinInterval: 10000, accountAgeMinimum: 604800000, action: 'kick' }),
            antiSpam: safeJSONParse(row.antiSpam, { enabled: false, messageThreshold: 5, messageInterval: 5000, duplicateThreshold: 3, mentionThreshold: 5 }),
            antiNuke: safeJSONParse(row.antiNuke, { enabled: false, channelDeleteThreshold: 3, roleDeleteThreshold: 3, banThreshold: 5, interval: 60000 }),
            autoMod: safeJSONParse(row.autoMod, { enabled: false, bannedWords: [], antiInvite: false, antiLink: false }),
            antiBot: safeJSONParse(row.antiBot, { enabled: false, action: 'kick' }),
            antiAlt: safeJSONParse(row.antiAlt, { enabled: false, minAgeDays: 7, action: 'kick' }),
            beastMode: safeJSONParse(row.beastMode, { enabled: false, active: false, scoreLimit: 25, action: 'clear_roles', activeUntil: 0 }),
            phishingScanner: safeJSONParse(row.phishingScanner, { enabled: true, action: 'delete' }),
            tokenLeakFilter: safeJSONParse(row.tokenLeakFilter, { enabled: true, action: 'delete_and_warn' }),
            scamImageFilter: safeJSONParse(row.scamImageFilter, { enabled: true, action: 'timeout', timeoutDuration: 900000 }),
            staffAbuseDetector: safeJSONParse(row.staffAbuseDetector, { enabled: true, minAgeDays: 14, action: 'alert' }),
            whitelist: safeJSONParse(row.whitelist, []),
            lockdown: Boolean(row.lockdown)
        };

        parsed.save = async function() {
            const db = getDB();
            const stmt = db.prepare(`
                UPDATE guilds SET
                    logChannelId = ?,
                    modLogChannelId = ?,
                    securityLogChannelId = ?,
                    automodLogChannelId = ?,
                    joinLeaveLogChannelId = ?,
                    verifyChannelId = ?,
                    verifiedRoleId = ?,
                    honeypotChannelId = ?,
                    webhookUrl = ?,
                    antiRaid = ?,
                    antiSpam = ?,
                    antiNuke = ?,
                    autoMod = ?,
                    antiBot = ?,
                    antiAlt = ?,
                    beastMode = ?,
                    phishingScanner = ?,
                    tokenLeakFilter = ?,
                    scamImageFilter = ?,
                    staffAbuseDetector = ?,
                    whitelist = ?,
                    lockdown = ?
                WHERE guildId = ?
            `);
            stmt.run(
                parsed.logChannelId || null,
                parsed.modLogChannelId || null,
                parsed.securityLogChannelId || null,
                parsed.automodLogChannelId || null,
                parsed.joinLeaveLogChannelId || null,
                parsed.verifyChannelId || null,
                parsed.verifiedRoleId || null,
                parsed.honeypotChannelId || null,
                parsed.webhookUrl || null,
                safeJSONStringify(parsed.antiRaid || {}, '{}'),
                safeJSONStringify(parsed.antiSpam || {}, '{}'),
                safeJSONStringify(parsed.antiNuke || {}, '{}'),
                safeJSONStringify(parsed.autoMod || {}, '{}'),
                safeJSONStringify(parsed.antiBot || {}, '{}'),
                safeJSONStringify(parsed.antiAlt || {}, '{}'),
                safeJSONStringify(parsed.beastMode || {}, '{}'),
                safeJSONStringify(parsed.phishingScanner || {}, '{}'),
                safeJSONStringify(parsed.tokenLeakFilter || {}, '{}'),
                safeJSONStringify(parsed.scamImageFilter || {}, '{}'),
                safeJSONStringify(parsed.staffAbuseDetector || {}, '{}'),
                safeJSONStringify(parsed.whitelist || [], '[]'),
                parsed.lockdown ? 1 : 0,
                parsed.guildId
            );
            return parsed;
        };

        return parsed;
    }

    static async getOrCreate(guildId) {
        const db = getDB();
        let row = db.prepare('SELECT * FROM guilds WHERE guildId = ?').get(guildId);
        if (!row) {
            db.prepare('INSERT INTO guilds (guildId) VALUES (?)').run(guildId);
            row = db.prepare('SELECT * FROM guilds WHERE guildId = ?').get(guildId);
        }
        return Guild._parseRow(row);
    }

    static async findOne(query) {
        const db = getDB();
        if (query.guildId) {
            const row = db.prepare('SELECT * FROM guilds WHERE guildId = ?').get(query.guildId);
            return Guild._parseRow(row);
        }
        return null;
    }

    static async findOneAndUpdate(filter, update, options = {}) {
        const db = getDB();
        const guildId = filter.guildId;
        if (!guildId) return null;

        let guild = await Guild.getOrCreate(guildId);
        const setObj = update.$set || update;

        if (setObj.logChannelId !== undefined) guild.logChannelId = setObj.logChannelId;
        if (setObj.modLogChannelId !== undefined) guild.modLogChannelId = setObj.modLogChannelId;
        if (setObj.securityLogChannelId !== undefined) guild.securityLogChannelId = setObj.securityLogChannelId;
        if (setObj.automodLogChannelId !== undefined) guild.automodLogChannelId = setObj.automodLogChannelId;
        if (setObj.joinLeaveLogChannelId !== undefined) guild.joinLeaveLogChannelId = setObj.joinLeaveLogChannelId;
        if (setObj.verifyChannelId !== undefined) guild.verifyChannelId = setObj.verifyChannelId;
        if (setObj.verifiedRoleId !== undefined) guild.verifiedRoleId = setObj.verifiedRoleId;
        if (setObj.honeypotChannelId !== undefined) guild.honeypotChannelId = setObj.honeypotChannelId;
        if (setObj.webhookUrl !== undefined) guild.webhookUrl = setObj.webhookUrl;
        if (setObj.lockdown !== undefined) guild.lockdown = Boolean(setObj.lockdown);
        if (setObj.whitelist !== undefined) guild.whitelist = setObj.whitelist;

        if (setObj.antiRaid) guild.antiRaid = { ...guild.antiRaid, ...setObj.antiRaid };
        if (setObj.antiSpam) guild.antiSpam = { ...guild.antiSpam, ...setObj.antiSpam };
        if (setObj.antiNuke) guild.antiNuke = { ...guild.antiNuke, ...setObj.antiNuke };
        if (setObj.autoMod) guild.autoMod = { ...guild.autoMod, ...setObj.autoMod };
        if (setObj.antiBot) guild.antiBot = { ...guild.antiBot, ...setObj.antiBot };
        if (setObj.antiAlt) guild.antiAlt = { ...guild.antiAlt, ...setObj.antiAlt };
        if (setObj.beastMode) guild.beastMode = { ...guild.beastMode, ...setObj.beastMode };
        if (setObj.phishingScanner) guild.phishingScanner = { ...guild.phishingScanner, ...setObj.phishingScanner };
        if (setObj.tokenLeakFilter) guild.tokenLeakFilter = { ...guild.tokenLeakFilter, ...setObj.tokenLeakFilter };
        if (setObj.scamImageFilter) guild.scamImageFilter = { ...guild.scamImageFilter, ...setObj.scamImageFilter };
        if (setObj.staffAbuseDetector) guild.staffAbuseDetector = { ...guild.staffAbuseDetector, ...setObj.staffAbuseDetector };

        await guild.save();
        return guild;
    }
}

module.exports = Guild;
