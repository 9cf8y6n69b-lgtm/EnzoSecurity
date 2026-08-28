const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

class ExtendedClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.AutoModerationExecution,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildInvites
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.GuildMember
            ]
        });

        this.commands = new Collection();
        this.buttons = new Collection();
        this.selects = new Collection();
        this.modals = new Collection();
        this.cooldowns = new Collection();
    }

    async loadCommands() {
        this.commands.clear();
        const commandsPath = path.join(__dirname, '..', 'commands');
        if (!fs.existsSync(commandsPath)) {
            console.log(`[CLIENT] Commands folder not found.`);
            return;
        }

        const commandFolders = fs.readdirSync(commandsPath);
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(folderPath, file);
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                    } else {
                        console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                }
            }
        }
        console.log(`[CLIENT] Loaded ${this.commands.size} commands.`);
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');
        if (!fs.existsSync(eventsPath)) {
            console.log(`[CLIENT] Events folder not found.`);
            return;
        }

        const eventFolders = fs.readdirSync(eventsPath);
        let count = 0;
        for (const folder of eventFolders) {
            const folderPath = path.join(eventsPath, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                for (const file of eventFiles) {
                    const filePath = path.join(folderPath, file);
                    const event = require(filePath);
                    if (event.once) {
                        this.once(event.name, (...args) => event.execute(...args, this));
                    } else {
                        this.on(event.name, (...args) => event.execute(...args, this));
                    }
                    count++;
                }
            } else if (folder.endsWith('.js')) {
                const event = require(folderPath);
                if (event.once) {
                    this.once(event.name, (...args) => event.execute(...args, this));
                } else {
                    this.on(event.name, (...args) => event.execute(...args, this));
                }
                count++;
            }
        }
        console.log(`[CLIENT] Loaded ${count} events.`);
    }

    async deployCommands() {
        const token = process.env.DISCORD_TOKEN;
        const clientId = process.env.CLIENT_ID || this.user?.id;
        const guildId = process.env.GUILD_ID || this.guilds.cache.first()?.id;

        if (!token || !clientId) {
            console.error('[ERROR] Cannot deploy commands: DISCORD_TOKEN or CLIENT_ID is missing.');
            return;
        }

        const rest = new REST({ version: '10' }).setToken(token);
        const commandsData = this.commands.map(command => command.data.toJSON());

        try {
            if (guildId) {
                console.log(`[REST] Started refreshing ${commandsData.length} guild (/) commands for guild ${guildId}.`);
                const data = await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commandsData }
                );
                console.log(`[REST] Successfully reloaded ${data.length} guild (/) commands.`);
            } else {
                console.log(`[REST] Started refreshing ${commandsData.length} global (/) commands.`);
                const data = await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commandsData }
                );
                console.log(`[REST] Successfully reloaded ${data.length} global (/) commands.`);
            }
        } catch (error) {
            console.error('[ERROR] Failed to deploy commands:', error);
        }
    }

    async start(token) {
        await this.loadEvents();
        await this.loadCommands();
        await this.login(token);
        console.log(`[CLIENT] Logged in as ${this.user?.tag || 'Discord Bot'}`);
    }
}

module.exports = ExtendedClient;
