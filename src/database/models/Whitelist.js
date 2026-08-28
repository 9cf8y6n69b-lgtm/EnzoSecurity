const { getDB } = require('../connect');

class Whitelist {
    static async create(data) {
        const db = getDB();
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO whitelist (guildId, userId, addedBy)
            VALUES (?, ?, ?)
        `);
        const info = stmt.run(data.guildId, data.userId, data.addedBy || 'System');

        try {
            const guildRow = db.prepare('SELECT whitelist FROM guilds WHERE guildId = ?').get(data.guildId);
            if (guildRow) {
                let wl = [];
                try { wl = JSON.parse(guildRow.whitelist || '[]'); } catch { wl = []; }
                if (!Array.isArray(wl)) wl = [];
                if (!wl.includes(data.userId)) {
                    wl.push(data.userId);
                    db.prepare('UPDATE guilds SET whitelist = ? WHERE guildId = ?').run(JSON.stringify(wl), data.guildId);
                }
            }
        } catch (e) {}

        return {
            id: info.lastInsertRowid,
            ...data,
            createdAt: new Date()
        };
    }

    static async find(query) {
        const db = getDB();
        const rows = db.prepare('SELECT * FROM whitelist WHERE guildId = ?').all(query.guildId);
        const userMap = new Map();
        for (const r of rows) {
            userMap.set(r.userId, {
                id: r.id,
                guildId: r.guildId,
                userId: r.userId,
                addedBy: r.addedBy,
                createdAt: new Date(r.createdAt)
            });
        }

        try {
            const guildRow = db.prepare('SELECT whitelist FROM guilds WHERE guildId = ?').get(query.guildId);
            if (guildRow) {
                let wl = [];
                try { wl = JSON.parse(guildRow.whitelist || '[]'); } catch { wl = []; }
                if (Array.isArray(wl)) {
                    for (const id of wl) {
                        if (!userMap.has(id)) {
                            userMap.set(id, {
                                id: 0,
                                guildId: query.guildId,
                                userId: id,
                                addedBy: 'Whitelist Command',
                                createdAt: new Date()
                            });
                        }
                    }
                }
            }
        } catch (e) {}

        return Array.from(userMap.values());
    }

    static async findOneAndDelete(query) {
        const db = getDB();
        db.prepare('DELETE FROM whitelist WHERE guildId = ? AND userId = ?').run(query.guildId, query.userId);

        try {
            const guildRow = db.prepare('SELECT whitelist FROM guilds WHERE guildId = ?').get(query.guildId);
            if (guildRow) {
                let wl = [];
                try { wl = JSON.parse(guildRow.whitelist || '[]'); } catch { wl = []; }
                if (Array.isArray(wl) && wl.includes(query.userId)) {
                    wl = wl.filter(id => id !== query.userId);
                    db.prepare('UPDATE guilds SET whitelist = ? WHERE guildId = ?').run(JSON.stringify(wl), query.guildId);
                }
            }
        } catch (e) {}

        return true;
    }
}

module.exports = Whitelist;
