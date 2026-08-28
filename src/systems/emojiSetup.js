const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const { REST, Routes } = require('discord.js');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'emojis');
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

const PREMIUM_GREY = '#8E9AAF';

const EMOJI_DEFINITIONS = {
    success: { icon: 'circle-check-filled', name: 'enzo_success' },
    error: { icon: 'circle-x-filled', name: 'enzo_error' },
    warning: { icon: 'alert-triangle-filled', name: 'enzo_warning' },
    shield: { icon: 'shield-filled', name: 'enzo_shield' },
    lock: { icon: 'lock-filled', name: 'enzo_lock' },
    unlock: { icon: 'lock-open-filled', name: 'enzo_unlock' },
    ban: { icon: 'gavel', name: 'enzo_ban' },
    kick: { icon: 'user-x', name: 'enzo_kick' },
    timeout: { icon: 'clock-filled', name: 'enzo_timeout' },
    log: { icon: 'file-text-filled', name: 'enzo_log' },
    raid: { icon: 'flame-filled', name: 'enzo_raid' },
    spam: { icon: 'message-x', name: 'enzo_spam' },
    nuke: { icon: 'bomb-filled', name: 'enzo_nuke' },
    verify: { icon: 'shield-check-filled', name: 'enzo_verify' },
    info: { icon: 'info-circle-filled', name: 'enzo_info' },
    stats: { icon: 'chart-bar-filled', name: 'enzo_stats' },
    join: { icon: 'user-plus', name: 'enzo_join' },
    leave: { icon: 'user-minus', name: 'enzo_leave' },
    bot: { icon: 'robot', name: 'enzo_bot' },
    alt: { icon: 'user-search', name: 'enzo_alt' },
    beast: { icon: 'swords', name: 'enzo_beast' },
    automod: { icon: 'shield-half-filled', name: 'enzo_automod' },
    invite: { icon: 'link', name: 'enzo_invite' },
    delete: { icon: 'trash', name: 'enzo_delete' },
    edit: { icon: 'pencil', name: 'enzo_edit' },
    channel: { icon: 'folder', name: 'enzo_channel' },
    role: { icon: 'user-check', name: 'enzo_role' },
    unban: { icon: 'user-check', name: 'enzo_unban' }
};

function fetchSVG(iconName) {
    return new Promise((resolve, reject) => {
        const isFilled = iconName.endsWith('-filled');
        const url = isFilled
            ? `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/filled/${iconName.replace('-filled', '')}.svg`
            : `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/${iconName}.svg`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                const fallbackUrl = `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/${iconName.replace('-filled', '')}.svg`;
                https.get(fallbackUrl, (fallbackRes) => {
                    let data = '';
                    fallbackRes.on('data', chunk => data += chunk);
                    fallbackRes.on('end', () => resolve(data));
                }).on('error', reject);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function applyPremiumGrey(svgContent) {
    let styled = svgContent;
    styled = styled.replace(/width="[^"]+"/, 'width="128"').replace(/height="[^"]+"/, 'height="128"');
    styled = styled.replace(/currentColor/g, PREMIUM_GREY);
    if (!styled.includes('fill="')) {
        styled = styled.replace('<svg', `<svg fill="${PREMIUM_GREY}"`);
    }
    if (styled.includes('stroke="') && !styled.includes('stroke="none"')) {
        styled = styled.replace(/stroke="[^"]+"/g, `stroke="${PREMIUM_GREY}"`);
    }
    return styled;
}

async function ensurePNG(iconName, emojiName) {
    if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }
    const pngPath = path.join(ASSETS_DIR, `${emojiName}.png`);
    if (!fs.existsSync(pngPath)) {
        console.log(`[EMOJIS] Generating missing PNG asset for ${emojiName}...`);
        const rawSvg = await fetchSVG(iconName);
        const styledSvg = applyPremiumGrey(rawSvg);
        await sharp(Buffer.from(styledSvg))
            .resize(128, 128)
            .png({ quality: 100 })
            .toFile(pngPath);
    }
    return pngPath;
}

async function checkAndUploadEmojis(client) {
    console.log('[EMOJIS] Checking custom Application emojis on startup...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.CLIENT_ID || client.user?.id;

    if (!clientId) {
        console.warn('[EMOJIS] Missing CLIENT_ID, skipping application emoji auto-check.');
        return;
    }

    let existingAppEmojis = [];
    try {
        const appRes = await rest.get(Routes.applicationEmojis(clientId));
        existingAppEmojis = Array.isArray(appRes) ? appRes : (appRes?.items || []);
    } catch (err) {
        console.warn(`[EMOJIS] Failed to fetch application emojis: ${err.message}`);
    }

    const emojiResults = {};
    let missingCount = 0;

    for (const [key, def] of Object.entries(EMOJI_DEFINITIONS)) {
        const emojiName = def.name;
        const foundApp = existingAppEmojis.find(e => e.name === emojiName);

        if (foundApp) {
            emojiResults[key] = `<:${emojiName}:${foundApp.id}>`;
        } else {
            missingCount++;
            console.log(`[EMOJIS] Missing application emoji "${emojiName}". Generating & uploading...`);
            try {
                const pngPath = await ensurePNG(def.icon, emojiName);
                const pngBuffer = fs.readFileSync(pngPath);
                const base64Data = `data:image/png;base64,${pngBuffer.toString('base64')}`;

                const uploaded = await rest.post(
                    Routes.applicationEmojis(clientId),
                    { body: { name: emojiName, image: base64Data } }
                );

                if (uploaded) {
                    console.log(`[EMOJIS] Uploaded Application Emoji ${emojiName} -> <:${uploaded.name}:${uploaded.id}>`);
                    emojiResults[key] = `<:${uploaded.name}:${uploaded.id}>`;
                }
            } catch (uploadErr) {
                console.error(`[EMOJIS ERROR] Failed to upload application emoji ${emojiName}:`, uploadErr.message);
            }
        }
    }

    if (missingCount === 0) {
        console.log('[EMOJIS] All Application emojis are verified & active! ✅');
    } else {
        console.log(`[EMOJIS] Successfully uploaded ${missingCount} Application emojis! 🎉`);
    }

    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config.emojis = { ...config.emojis, ...emojiResults };
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            console.log('[EMOJIS] Updated config.json with current emoji IDs.');
        } catch (err) {
            console.error('[EMOJIS ERROR] Failed to update config.json:', err.message);
        }
    }

    return emojiResults;
}

module.exports = { checkAndUploadEmojis };
