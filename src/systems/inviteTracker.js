class InviteTracker {
    constructor() {

        this.invites = new Map();
    }

    async cacheGuildInvites(guild) {
        if (!guild || !guild.members.me?.permissions.has('ManageGuild')) return;
        try {
            const guildInvites = await guild.invites.fetch().catch(() => null);
            if (!guildInvites) return;

            const codeMap = new Map();
            guildInvites.forEach(inv => {
                codeMap.set(inv.code, {
                    uses: inv.uses || 0,
                    inviter: inv.inviter,
                    code: inv.code
                });
            });
            this.invites.set(guild.id, codeMap);
        } catch (err) {

        }
    }

    async findInviter(member) {
        const guild = member.guild;
        if (!guild || !guild.members.me?.permissions.has('ManageGuild')) {
            return { inviter: null, code: null, uses: null };
        }

        try {
            const cachedInvites = this.invites.get(guild.id) || new Map();
            const currentInvites = await guild.invites.fetch().catch(() => null);

            let usedInvite = null;

            if (currentInvites) {
                currentInvites.forEach(inv => {
                    const prev = cachedInvites.get(inv.code);
                    if (prev && inv.uses > prev.uses) {
                        usedInvite = inv;
                    }
                });

                this.cacheGuildInvites(guild).catch(() => null);
            }

            if (usedInvite) {
                return {
                    inviter: usedInvite.inviter,
                    code: usedInvite.code,
                    uses: usedInvite.uses
                };
            }
        } catch (err) {
            console.error('[INVITE TRACKER ERROR]', err.message);
        }

        return { inviter: null, code: null, uses: null };
    }
}

module.exports = new InviteTracker();
