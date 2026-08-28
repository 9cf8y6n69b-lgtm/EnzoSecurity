const { getDB } = require('../connect');

class WarningQueryBuilder {
    constructor(query) {
        this.query = query;
        this._limit = 100;
    }

    sort(sortObj) {
        return this;
    }

    limit(num) {
        this._limit = num || 100;
        return this;
    }

    async then(resolve, reject) {
        try {
            const db = getDB();
            let sql = 'SELECT * FROM warnings WHERE guildId = ?';
            const params = [this.query.guildId];

            if (this.query.userId) {
                sql += ' AND userId = ?';
                params.push(this.query.userId);
            }

            sql += ' ORDER BY id DESC LIMIT ?';
            params.push(this._limit);

            const rows = db.prepare(sql).all(...params);
            const warnings = rows.map(r => ({
                _id: r.id.toString(),
                id: r.id,
                guildId: r.guildId,
                userId: r.userId,
                moderatorId: r.moderatorId,
                reason: r.reason,
                createdAt: new Date(r.createdAt)
            }));
            resolve(warnings);
        } catch (err) {
            if (reject) reject(err);
            else throw err;
        }
    }
}

class Warning {
    static async create(data) {
        const db = getDB();
        const stmt = db.prepare(`
            INSERT INTO warnings (guildId, userId, moderatorId, reason)
            VALUES (?, ?, ?, ?)
        `);
        const info = stmt.run(
            data.guildId,
            data.userId,
            data.moderatorId,
            data.reason || 'No reason provided'
        );
        return {
            _id: info.lastInsertRowid.toString(),
            id: info.lastInsertRowid,
            ...data,
            createdAt: new Date()
        };
    }

    static find(query) {
        return new WarningQueryBuilder(query);
    }

    static async findById(id, guildId) {
        const db = getDB();
        let row;
        if (guildId) {
            row = db.prepare('SELECT * FROM warnings WHERE id = ? AND guildId = ?').get(id, guildId);
        } else {
            row = db.prepare('SELECT * FROM warnings WHERE id = ?').get(id);
        }
        if (!row) return null;
        return {
            _id: row.id.toString(),
            id: row.id,
            guildId: row.guildId,
            userId: row.userId,
            moderatorId: row.moderatorId,
            reason: row.reason,
            createdAt: new Date(row.createdAt)
        };
    }

    static async deleteById(id, guildId) {
        const db = getDB();
        let info;
        if (guildId) {
            info = db.prepare('DELETE FROM warnings WHERE id = ? AND guildId = ?').run(id, guildId);
        } else {
            info = db.prepare('DELETE FROM warnings WHERE id = ?').run(id);
        }
        return info.changes > 0;
    }

    static async deleteMany(query) {
        const db = getDB();
        let info;
        if (query.guildId && query.userId) {
            info = db.prepare('DELETE FROM warnings WHERE guildId = ? AND userId = ?').run(query.guildId, query.userId);
        } else if (query.guildId) {
            info = db.prepare('DELETE FROM warnings WHERE guildId = ?').run(query.guildId);
        } else {
            info = { changes: 0 };
        }
        return info.changes;
    }

    static async findOneAndDelete(query) {
        const db = getDB();
        const warningId = query._id || query.id;
        const guildId = query.guildId;

        if (warningId && guildId) {
            db.prepare('DELETE FROM warnings WHERE id = ? AND guildId = ?').run(warningId, guildId);
        } else if (warningId) {
            db.prepare('DELETE FROM warnings WHERE id = ?').run(warningId);
        }
        return true;
    }
}

module.exports = Warning;
