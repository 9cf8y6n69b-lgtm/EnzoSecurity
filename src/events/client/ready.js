const { Events, ActivityType } = require('discord.js');
const { checkAndUploadEmojis } = require('../../systems/emojiSetup');
const inviteTracker = require('../../systems/inviteTracker');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        try {
            const guildCount = client.guilds.cache.size;
            const userCount = client.users.cache.size;

            console.log(`[READY] Logged in as ${client.user.tag}`);
            console.log(`[READY] Serving ${guildCount} guilds and ${userCount} users`);

            client.user.setActivity({
                name: `Protecting ${client.guilds.cache.first()?.name || 'your server'}`,
                type: ActivityType.Custom,
            });

            for (const guild of client.guilds.cache.values()) {
                await inviteTracker.cacheGuildInvites(guild).catch(() => null);
            }

            await checkAndUploadEmojis(client);

            const warningSystem = require('../../systems/warningSystem');
            setInterval(() => {
                warningSystem.checkExpiredPunishments(client).catch(err => console.error('[PUNISHMENT CHECK ERROR]', err.message));
            }, 60000);

            if (typeof client.deployCommands === 'function') {
                await client.deployCommands();
                console.log(`[READY] Commands deployed successfully.`);
            }
        } catch (error) {
            console.error(`[READY EVENT ERROR]`, error);
        }
    },
};
