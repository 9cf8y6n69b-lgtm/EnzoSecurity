const { getDB } = require('../connect');

function safeJSONParse(value, fallback = null) {
    if (typeof value !== 'string') return value || fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function safeJSONStringify(value, fallback = null) {
    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
}

class AuditLogQueryBuilder {
    constructor(query) {
        this.query = query;
        this._sort = 'createdAt DESC';
        this._skip = 0;
        this._limit = 50;
    }

    sort(sortObj) {
        if (sortObj && sortObj.createdAt === -1) {
            this._sort = 'id DESC';
        }
        return this;
    }

    skip(num) {
        this._skip = num || 0;
        return this;
    }

    limit(num) {
        this._limit = num || 50;
        return this;
    }

    async then(resolve, reject) {
        try {
            const db = getDB();
            let sql = 'SELECT * FROM audit_logs WHERE guildId = ?';
            const params = [this.query.guildId];

            if (this.query.action && this.query.action !== 'ALL') {
                sql += ' AND action = ?';
                params.push(this.query.action);
            }

            sql += ` ORDER BY ${this._sort} LIMIT ? OFFSET ?`;
            params.push(this._limit, this._skip);

            const rows = db.prepare(sql).all(...params);
            const logs = rows.map(r => ({
                id: r.id,
                guildId: r.guildId,
                action: r.action,
                targetId: r.targetId,
                executorId: r.executorId,
                reason: r.reason,
                details: safeJSONParse(r.details, null),
                createdAt: new Date(r.createdAt)
            }));
            resolve(logs);
        } catch (err) {
            if (reject) reject(err);
            else throw err;
        }
    }
}

class AuditLog {
    static create(data) {
        if (!data) return null;
        const db = getDB();
        const stmt = db.prepare(`
            INSERT INTO audit_logs (guildId, action, targetId, executorId, reason, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const targetId = typeof data.targetId === 'string'
            ? data.targetId
            : (data.targetId?.id || (typeof data.targetId?.tag === 'string' ? data.targetId.tag : (data.targetId ? String(data.targetId) : null)));

        const executorId = typeof data.executorId === 'string'
            ? data.executorId
            : (data.executorId?.id || (typeof data.executorId?.tag === 'string' ? data.executorId.tag : (data.executorId ? String(data.executorId) : null)));

        const reason = typeof data.reason === 'string'
            ? data.reason
            : (data.reason ? String(data.reason) : null);

        const detailsJson = data.details !== undefined && data.details !== null
            ? safeJSONStringify(data.details, null)
            : null;

        const info = stmt.run(
            data.guildId || 'UNKNOWN',
            data.action || 'UNKNOWN',
            targetId,
            executorId,
            reason,
            detailsJson
        );
        return {
            id: info.lastInsertRowid,
            ...data,
            createdAt: new Date()
        };
    }

    static find(query) {
        return new AuditLogQueryBuilder(query);
    }

    static async countDocuments(query) {
        const db = getDB();
        let sql = 'SELECT COUNT(*) as count FROM audit_logs WHERE guildId = ?';
        const params = [query.guildId];

        if (query.action && query.action !== 'ALL') {
            sql += ' AND action = ?';
            params.push(query.action);
        }

        const row = db.prepare(sql).get(...params);
        return row ? row.count : 0;
    }

    static async getAnalytics(guildId) {
        const db = getDB();
        const total = db.prepare('SELECT COUNT(*) as c FROM audit_logs WHERE guildId = ?').get(guildId)?.c || 0;
        const today = db.prepare("SELECT COUNT(*) as c FROM audit_logs WHERE guildId = ? AND createdAt >= datetime('now', '-1 day')").get(guildId)?.c || 0;

        const actionRows = db.prepare('SELECT action, COUNT(*) as count FROM audit_logs WHERE guildId = ? GROUP BY action').all(guildId);
        const byAction = {};
        actionRows.forEach(r => { byAction[r.action] = r.count; });

        const timelineRows = db.prepare("SELECT strftime('%Y-%m-%d', createdAt) as date, COUNT(*) as count FROM audit_logs WHERE guildId = ? AND createdAt >= datetime('now', '-7 days') GROUP BY date ORDER BY date ASC").all(guildId);
        const violatorsRows = db.prepare('SELECT targetId, COUNT(*) as count FROM audit_logs WHERE guildId = ? AND targetId IS NOT NULL GROUP BY targetId ORDER BY count DESC LIMIT 5').all(guildId);

        return {
            total,
            today,
            byAction,
            timeline: timelineRows,
            topViolators: violatorsRows
        };
    }
}

module.exports = AuditLog;
