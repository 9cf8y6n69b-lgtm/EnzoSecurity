const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');
let db = null;

function connectDB() {
    try {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 5000');
        db.pragma('foreign_keys = ON');
        db.pragma('synchronous = NORMAL');

        db.exec(`
            CREATE TABLE IF NOT EXISTS guilds (
                guildId TEXT PRIMARY KEY,
                logChannelId TEXT DEFAULT NULL,
                modLogChannelId TEXT DEFAULT NULL,
                securityLogChannelId TEXT DEFAULT NULL,
                automodLogChannelId TEXT DEFAULT NULL,
                joinLeaveLogChannelId TEXT DEFAULT NULL,
                verifyChannelId TEXT DEFAULT NULL,
                verifiedRoleId TEXT DEFAULT NULL,
                honeypotChannelId TEXT DEFAULT NULL,
                webhookUrl TEXT DEFAULT NULL,
                antiRaid TEXT DEFAULT '{"enabled":false,"joinThreshold":10,"joinInterval":10000,"accountAgeMinimum":604800000,"action":"kick"}',
                antiSpam TEXT DEFAULT '{"enabled":false,"messageThreshold":5,"messageInterval":5000,"duplicateThreshold":3,"mentionThreshold":5}',
                antiNuke TEXT DEFAULT '{"enabled":false,"channelDeleteThreshold":3,"roleDeleteThreshold":3,"banThreshold":5,"interval":60000}',
                autoMod TEXT DEFAULT '{"enabled":false,"bannedWords":[],"antiInvite":false,"antiLink":false}',
                antiBot TEXT DEFAULT '{"enabled":false,"action":"kick"}',
                antiAlt TEXT DEFAULT '{"enabled":false,"minAgeDays":7,"action":"kick"}',
                beastMode TEXT DEFAULT '{"enabled":false,"active":false,"scoreLimit":25,"action":"clear_roles","activeUntil":0}',
                phishingScanner TEXT DEFAULT '{"enabled":true,"action":"delete"}',
                tokenLeakFilter TEXT DEFAULT '{"enabled":true,"action":"delete_and_warn"}',
                scamImageFilter TEXT DEFAULT '{"enabled":true,"action":"timeout","timeoutDuration":900000}',
                staffAbuseDetector TEXT DEFAULT '{"enabled":true,"minAgeDays":14,"action":"alert"}',
                whitelist TEXT DEFAULT '[]',
                lockdown INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                action TEXT NOT NULL,
                targetId TEXT DEFAULT NULL,
                executorId TEXT DEFAULT NULL,
                reason TEXT DEFAULT NULL,
                details TEXT DEFAULT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                moderatorId TEXT NOT NULL,
                reason TEXT DEFAULT 'No reason provided',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS whitelist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                addedBy TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guildId, userId)
            );

            CREATE TABLE IF NOT EXISTS temp_punishments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                removedRoleIds TEXT NOT NULL,
                expiresAt DATETIME NOT NULL,
                reason TEXT DEFAULT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_created ON audit_logs(guildId, createdAt);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_action ON audit_logs(guildId, action);
            CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guildId, userId);
            CREATE INDEX IF NOT EXISTS idx_temp_punishments_expires ON temp_punishments(expiresAt);
        `);

        const cols = ['modLogChannelId', 'securityLogChannelId', 'automodLogChannelId', 'joinLeaveLogChannelId'];
        for (const col of cols) {
            try {
                db.exec(`ALTER TABLE guilds ADD COLUMN ${col} TEXT DEFAULT NULL`);
            } catch (e) {

            }
        }
        try {
            db.exec(`ALTER TABLE guilds ADD COLUMN beastMode TEXT DEFAULT '{"enabled":false,"active":false,"scoreLimit":25,"action":"clear_roles","activeUntil":0}'`);
        } catch (e) {}
        try { db.exec(`ALTER TABLE guilds ADD COLUMN phishingScanner TEXT DEFAULT '{"enabled":true,"action":"delete"}'`); } catch (e) {}
        try { db.exec(`ALTER TABLE guilds ADD COLUMN tokenLeakFilter TEXT DEFAULT '{"enabled":true,"action":"delete_and_warn"}'`); } catch (e) {}
        try { db.exec(`ALTER TABLE guilds ADD COLUMN scamImageFilter TEXT DEFAULT '{"enabled":true,"action":"timeout","timeoutDuration":900000}'`); } catch (e) {}
        try { db.exec(`ALTER TABLE guilds ADD COLUMN honeypotChannelId TEXT DEFAULT NULL`); } catch (e) {}
        try { db.exec(`ALTER TABLE guilds ADD COLUMN staffAbuseDetector TEXT DEFAULT '{"enabled":true,"minAgeDays":14,"action":"alert"}'`); } catch (e) {}

        console.log('[DATABASE] Connected to SQLite database successfully (database.sqlite).');
        return db;
    } catch (error) {
        console.error('[DATABASE] Connection failed:', error.message);
        throw error;
    }
}

function getDB() {
    if (!db) {
        return connectDB();
    }
    return db;
}

module.exports = connectDB;
module.exports.getDB = getDB;
