const path = require('path');
const express = require('express');
const Guild = require('../database/models/Guild');
const AuditLog = require('../database/models/AuditLog');
const Warning = require('../database/models/Warning');
const Whitelist = require('../database/models/Whitelist');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const configuredApiKey = process.env.DASHBOARD_API_KEY || null;

function apiAuthMiddleware(req, res, next) {

    if (req.path === '/health' || req.path === '/api/health') {
        return next();
    }

    if (configuredApiKey) {
        const authHeader = req.headers.authorization || req.headers['x-api-key'] || req.query.apiKey;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized: Missing Authorization header or API token' });
        }
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
        if (bearerToken !== configuredApiKey) {
            return res.status(403).json({ error: 'Forbidden: Invalid API token' });
        }
    }

    req.headers.authorization = req.headers.authorization || (configuredApiKey ? `Bearer ${configuredApiKey}` : null);
    next();
}

app.use('/api', apiAuthMiddleware);

module.exports = function initDashboard(client) {

    app.get('/api/health', (req, res) => {
        res.json({
            status: 'online',
            uptime: client.uptime,
            readyAt: client.readyAt,
            ping: client.ws.ping
        });
    });

    app.get('/api/stats', (req, res) => {
        res.json({
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            channels: client.channels.cache.size,
            commands: client.commands.size,
            ping: client.ws.ping,
            uptime: client.uptime,
            readyAt: client.readyAt,
            memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
        });
    });

    app.get('/api/guilds', (req, res) => {
        const guilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            icon: g.iconURL({ dynamic: true }),
            owner: g.ownerId
        }));
        res.json(guilds);
    });

    app.get('/api/guilds/:guildId/channels', (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        const channels = guild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type
            }));
        res.json(channels);
    });

    app.get('/api/guilds/:guildId/roles', (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id && !r.managed)
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(roles);
    });

    app.get('/api/guilds/:guildId/members', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });
        try {
            await guild.members.fetch({ limit: 100 }).catch(() => {});
        } catch (e) {}
        const members = guild.members.cache
            .filter(m => !m.user.bot)
            .map(m => ({
                id: m.id,
                tag: m.user.tag,
                displayName: m.displayName
            }))
            .slice(0, 100);
        res.json(members);
    });

    app.get('/api/guilds/:guildId/settings', async (req, res) => {
        try {
            const settings = await Guild.getOrCreate(req.params.guildId);
            res.json(settings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.patch('/api/guilds/:guildId/settings', async (req, res) => {
        try {
            const settings = await Guild.findOneAndUpdate(
                { guildId: req.params.guildId },
                { $set: req.body },
                { new: true, runValidators: true }
            );
            if (!settings) {
                return res.status(404).json({ error: 'Guild not found' });
            }
            res.json(settings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/guilds/:guildId/logs', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const page = parseInt(req.query.page) || 1;
            const skip = (page - 1) * limit;

            const query = { guildId: req.params.guildId };
            if (req.query.action && req.query.action !== 'ALL') {
                query.action = req.query.action;
            }

            const logs = await AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await AuditLog.countDocuments(query);

            res.json({
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/guilds/:guildId/analytics', async (req, res) => {
        try {
            const data = await AuditLog.getAnalytics(req.params.guildId);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/guilds/:guildId/warnings', async (req, res) => {
        try {
            const warnings = await Warning.find({ guildId: req.params.guildId })
                .sort({ createdAt: -1 })
                .limit(100);
            res.json(warnings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/guilds/:guildId/warnings/:warningId', async (req, res) => {
        try {
            await Warning.findOneAndDelete({ _id: req.params.warningId, guildId: req.params.guildId });
            res.json({ success: true, message: 'تم مسح التحذير بنجاح' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/guilds/:guildId/whitelist', async (req, res) => {
        try {
            const settings = await Guild.getOrCreate(req.params.guildId);
            res.json({ whitelist: settings.whitelist || [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/guilds/:guildId/whitelist', async (req, res) => {
        try {
            const { targetId } = req.body;
            if (!targetId) return res.status(400).json({ error: 'targetId is required' });

            await Whitelist.create({ guildId: req.params.guildId, userId: targetId, addedBy: 'Dashboard' }).catch(() => null);
            const settings = await Guild.getOrCreate(req.params.guildId);
            res.json({ whitelist: settings.whitelist || [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/guilds/:guildId/whitelist/:targetId', async (req, res) => {
        try {
            await Whitelist.findOneAndDelete({ guildId: req.params.guildId, userId: req.params.targetId }).catch(() => null);
            const settings = await Guild.getOrCreate(req.params.guildId);
            res.json({ whitelist: settings.whitelist || [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/guilds/:guildId/deploy-verification', async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);
            if (!guild) return res.status(404).json({ error: 'Guild not found' });

            const settings = await Guild.getOrCreate(req.params.guildId);
            if (!settings.verifyChannelId) {
                return res.status(400).json({ error: 'يرجى تحديد قناة التحقق أولاً من إعدادات القنوات.' });
            }

            const channel = guild.channels.cache.get(settings.verifyChannelId);
            if (!channel) {
                return res.status(404).json({ error: 'قناة التحقق غير موجودة بالسيرفر.' });
            }

            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('🛡️ نظام التحقق والأمان | Verification System')
                .setDescription('مرحباً بك في السيرفر! يرجى الضغط على زر **التحقق (Verify)** في الأسفل للحصول على الرول والدخول إلى باقي القنوات.')
                .setColor('#3B82F6')
                .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('تأكيد الهوية (Verify)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

            await channel.send({ embeds: [embed], components: [row] });
            res.json({ success: true, message: 'تم إرسال لوحة التحقق إلى القناة بنجاح!' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    const PORT = process.env.DASHBOARD_PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[DASHBOARD] Web API running on http://localhost:${PORT}`);
    });
};
