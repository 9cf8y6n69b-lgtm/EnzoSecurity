require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'emojis');

async function main() {
    console.log('🚀 Uploading custom Tabler emojis to Discord Application Emojis...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const clientId = process.env.CLIENT_ID;

    if (!clientId) {
        console.error('❌ CLIENT_ID is missing in .env');
        process.exit(1);
    }

    let existingAppEmojis = [];
    try {
        const appRes = await rest.get(Routes.applicationEmojis(clientId));
        existingAppEmojis = Array.isArray(appRes) ? appRes : (appRes?.items || []);
        console.log(`[DISCORD] Found ${existingAppEmojis.length} existing application emojis.`);
    } catch (err) {
        console.log(`[DISCORD] App emojis check: ${err.message}`);
    }

    const files = fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.png'));
    const uploadedEmojis = {};

    for (const file of files) {
        const emojiName = path.basename(file, '.png');
        const key = emojiName.replace('enzo_', '');
        const pngPath = path.join(ASSETS_DIR, file);
        const pngBuffer = fs.readFileSync(pngPath);
        const base64Data = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        const foundApp = existingAppEmojis.find(e => e.name === emojiName);

        if (foundApp) {
            console.log(`[EXISTS App] ${emojiName} -> <:${emojiName}:${foundApp.id}>`);
            uploadedEmojis[key] = `<:${emojiName}:${foundApp.id}>`;
        } else {
            try {
                const createdApp = await rest.post(
                    Routes.applicationEmojis(clientId),
                    { body: { name: emojiName, image: base64Data } }
                );
                console.log(`🎉 Uploaded App Emoji ${emojiName} -> <:${createdApp.name}:${createdApp.id}>`);
                uploadedEmojis[key] = `<:${createdApp.name}:${createdApp.id}>`;
            } catch (appErr) {
                console.error(`❌ Failed app upload for ${emojiName}: ${appErr.message}`);
            }
        }
    }

    console.log('\n✨ Uploaded Application Emojis Map:');
    console.log(JSON.stringify(uploadedEmojis, null, 2));

    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.emojis = { ...config.emojis, ...uploadedEmojis };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ Updated config.json with custom Application emojis!');
    }
}

main().catch(console.error);
