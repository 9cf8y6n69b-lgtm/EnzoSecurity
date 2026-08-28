const { getDB } = require('../database/connect');
const Warning = require('../database/models/Warning');
const logger = require('./logger');
const { warnEmbed } = require('../utils/embeds');

class WarningSystem {

    async addWarning(guild, member, moderatorId, reason = 'مخالفة أنظمة الأمان') {
        if (!guild || !member) return;

        await Warning.create({
            guildId: guild.id,
            userId: member.id,
            moderatorId: moderatorId || guild.client.user.id,
            reason: reason
        });

        const userWarnings = await Warning.find({ guildId: guild.id, userId: member.id });
        const count = userWarnings.length;

        try {
            await member.send({
                embeds: [warnEmbed(`تنبيه أمني تلقائي في **${guild.name}**\nعدد تحذيراتك الحالية ${count}\nالسبب ${reason}`)]
            });
        } catch (err) {}

        let escalationSummary = `تحذير رقم ${count}`;

        if (count === 2 && member.moderatable) {

            const timeoutDuration = 3600000;
            await member.timeout(timeoutDuration, `تراكم التحذيرات ${count}`).catch(() => {});
            escalationSummary = `إسكات مؤقت لمدة ساعة لتراكم ${count} تحذيرات`;
        } else if (count === 3 && member.manageable) {

            const removedRoles = await this.stripRolesTemporarily(guild, member, 86400000, `تراكم ${count} تحذيرات`);
            escalationSummary = `سحب ${removedRoles.length} رتب مؤقتاً لمدة 24 ساعة لتراكم ${count} تحذيرات`;
        } else if (count >= 4 && member.kickable) {

            await member.kick(`تجاوز الحد الأقصى للتحذيرات ${count}`).catch(() => {});
            escalationSummary = `طرد من السيرفر لتجاوز الحد الأقصى للتحذيرات (${count})`;
        }

        await logger.log(guild, 'WARN', {
            target: member.user,
            executor: { tag: 'النظام التلقائي' },
            reason: reason,
            details: { warningCount: count, action: escalationSummary }
        });

        return { count, escalationSummary };
    }

    async stripRolesTemporarily(guild, member, durationMs, reason) {
        const memberRoles = member.roles.cache.filter(r => r.id !== guild.id && !r.managed && r.editable);
        const roleIds = memberRoles.map(r => r.id);

        if (roleIds.length === 0) return [];

        try {

            await member.roles.remove(roleIds, reason).catch(() => {});

            const expiresAt = new Date(Date.now() + durationMs).toISOString();

            const db = getDB();
            db.prepare(`
                INSERT INTO temp_punishments (guildId, userId, removedRoleIds, expiresAt, reason)
                VALUES (?, ?, ?, ?, ?)
            `).run(guild.id, member.id, JSON.stringify(roleIds), expiresAt, reason);

            return roleIds;
        } catch (err) {
            console.error('[WARNING SYSTEM] Failed to strip roles:', err.message);
            return [];
        }
    }

    async checkExpiredPunishments(client) {
        try {
            const db = getDB();
            const now = new Date().toISOString();

            const expired = db.prepare(`
                SELECT * FROM temp_punishments WHERE expiresAt <= ?
            `).all(now);

            for (const item of expired) {
                const guild = client.guilds.cache.get(item.guildId);
                if (guild) {
                    const member = await guild.members.fetch(item.userId).catch(() => null);
                    if (member) {
                        const roleIds = JSON.parse(item.removedRoleIds || '[]');
                        if (roleIds.length > 0) {
                            await member.roles.add(roleIds, 'انتهاء مدة العقوبة المؤقتة وتطبيق استعادة الرتب').catch(() => {});
                        }
                    }
                }

                db.prepare('DELETE FROM temp_punishments WHERE id = ?').run(item.id);
            }
        } catch (err) {
            console.error('[TEMP PUNISHMENT RESTORE ERROR]', err.message);
        }
    }
}

module.exports = new WarningSystem();
