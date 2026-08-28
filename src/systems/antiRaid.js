const logger = require('./logger');

class AntiRaid {
    constructor() {

        this.guilds = new Map();
    }

    _initGuild(guildId) {
        if (!this.guilds.has(guildId)) {
            this.guilds.set(guildId, { joins: [], cumulativeScore: 0, windowStart: Date.now(), raidMode: false });
        }
        return this.guilds.get(guildId);
    }

    async handleJoin(member, settings) {
        if (!member || !member.guild || !member.user || !settings?.antiRaid?.enabled) return false;

        const guildData = this._initGuild(member.guild.id);
        const now = Date.now();
        const accountAgeDays = Math.floor((now - (member.user.createdTimestamp || now)) / (1000 * 60 * 60 * 24));

        let joinScore = 0;
        const reasons = [];

        if (!member.user.avatar) {
            joinScore += 5;
            reasons.push('بدون صورة (No Avatar)');
        }

        if (accountAgeDays < 7) {
            joinScore += 5;
            reasons.push(`حساب حديث (${accountAgeDays} يوم)`);
        }

        const lastJoin = guildData.joins.length > 0 ? guildData.joins[guildData.joins.length - 1] : null;
        if (lastJoin && (now - lastJoin.timestamp < 3000)) {
            joinScore += 10;
            reasons.push('دخول سريع ومتتابع (Join Row)');
        }

        guildData.joins.push({ userId: member.id, timestamp: now, score: joinScore });

        const interval = settings.antiRaid.joinInterval || 10000;
        guildData.joins = guildData.joins.filter(j => now - j.timestamp < interval);

        const totalWindowScore = guildData.joins.reduce((acc, curr) => acc + curr.score, 0);
        const joinCountWindow = guildData.joins.length;
        const scoreLimit = settings.antiRaid.scoreLimit || 50;
        const joinThreshold = settings.antiRaid.joinThreshold || 10;

        if ((totalWindowScore >= scoreLimit || joinCountWindow >= joinThreshold) && !guildData.raidMode) {
            guildData.raidMode = true;

            const action = settings.antiRaid.action || 'kick';
            const raidersToPunish = [...guildData.joins];

            for (const join of raidersToPunish) {
                try {
                    const raidMember = await member.guild.members.fetch(join.userId).catch(() => null);
                    if (raidMember && raidMember.kickable) {
                        if (action === 'ban') {
                            await raidMember.ban({ reason: `[ANTI-RAID] رصد هجوم غارات وحظر تلقائي (نقاط التهديد: ${totalWindowScore})` }).catch(() => null);
                        } else {
                            await raidMember.kick(`[ANTI-RAID] رصد هجوم غارات وطرد تلقائي (نقاط التهديد: ${totalWindowScore})`).catch(() => null);
                        }
                    }
                } catch (err) {}
            }

            await logger.log(member.guild, 'ANTI_RAID', {
                target: member.user,
                reason: `🚨 [ANTI-RAID] تم رصد هجوم غارات كاسح! (النقاط التراكمية: ${totalWindowScore}/${scoreLimit})`,
                details: { joinsInWindow: joinCountWindow, actionTaken: action === 'ban' ? 'حظر المهاجمين' : 'طرد المهاجمين' }
            });

            setTimeout(() => {
                guildData.raidMode = false;
                guildData.joins = [];
            }, 60000);

            return true;
        }

        return false;
    }

    isRaidMode(guildId) {
        const guildData = this.guilds.get(guildId);
        return guildData ? guildData.raidMode : false;
    }
}

module.exports = new AntiRaid();
