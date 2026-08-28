const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('إدارة نظام الرقابة التلقائية وفلتر الكلمات المحظورة')
        .addSubcommandGroup(group =>
            group.setName('words')
                .setDescription('إدارة قائمة الكلمات المحظورة')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('إضافة كلمة أو عبارة لقائمة الحظر')
                        .addStringOption(o => o.setName('word').setDescription('الكلمة أو العبارة').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('إزالة كلمة من قائمة الحظر')
                        .addStringOption(o => o.setName('word').setDescription('الكلمة المراد إزالتها').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('عرض قائمة الكلمات المحظورة في السيرفر')
                )
                .addSubcommand(sub =>
                    sub.setName('clear')
                        .setDescription('مسح جميع الكلمات المحظورة دفعة واحدة')
                )
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('عرض حالة وإعدادات نظام الرقابة التلقائية (AutoMod)')
        )
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('تفعيل أو تعطيل نظام الرقابة التلقائية بالكامل')
                .addBooleanOption(o => o.setName('enable').setDescription('تفعيل أو تعطيل').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('antilink')
                .setDescription('تفعيل أو تعطيل مانع الروابط الخارجية')
                .addBooleanOption(o => o.setName('enable').setDescription('تفعيل أو تعطيل').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('antiinvite')
                .setDescription('تفعيل أو تعطيل مانع روابط دعوات الديسكورد')
                .addBooleanOption(o => o.setName('enable').setDescription('تفعيل أو تعطيل').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const group = interaction.options.getSubcommandGroup(false);
            const sub = interaction.options.getSubcommand();
            const guildSettings = await Guild.getOrCreate(interaction.guild.id);
            const em = config.emojis || {};

            let autoMod = guildSettings.autoMod || { enabled: false, bannedWords: [], antiInvite: false, antiLink: false };
            if (!Array.isArray(autoMod.bannedWords)) autoMod.bannedWords = [];

            if (group === 'words') {
                if (sub === 'add') {
                    const word = interaction.options.getString('word').trim();
                    if (!word) {
                        return interaction.reply({ embeds: [errorEmbed('يرجى تحديد كلمة صالحة.')], flags: [MessageFlags.Ephemeral] });
                    }

                    if (autoMod.bannedWords.includes(word.toLowerCase())) {
                        return interaction.reply({ embeds: [errorEmbed(`الكلمة **${word}** موجودة بالفعل في قائمة الكلمات المحظورة.`)], flags: [MessageFlags.Ephemeral] });
                    }

                    autoMod.bannedWords.push(word.toLowerCase());
                    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                    logger.info(`AUTOMOD: Word added "${word}" by ${interaction.user.tag}`);
                    return interaction.reply({
                        embeds: [successEmbed(`تمت إضافة الكلمة **${word}** إلى قائمة الكلمات المحظورة بنجاح. إجمالي الكلمات: **${autoMod.bannedWords.length}**`)]
                    });
                }

                if (sub === 'remove') {
                    const word = interaction.options.getString('word').trim().toLowerCase();
                    const index = autoMod.bannedWords.indexOf(word);

                    if (index === -1) {
                        return interaction.reply({ embeds: [errorEmbed(`الكلمة **${word}** غير موجودة في قائمة الكلمات المحظورة.`)], flags: [MessageFlags.Ephemeral] });
                    }

                    autoMod.bannedWords.splice(index, 1);
                    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                    logger.info(`AUTOMOD: Word removed "${word}" by ${interaction.user.tag}`);
                    return interaction.reply({
                        embeds: [successEmbed(`تمت إزالة الكلمة **${word}** من قائمة الكلمات المحظورة بنجاح. المتبقي: **${autoMod.bannedWords.length}**`)]
                    });
                }

                if (sub === 'list') {
                    if (autoMod.bannedWords.length === 0) {
                        return interaction.reply({
                            embeds: [infoEmbed('لا توجد أي كلمات محظورة مسجلة في السيرفر حالياً.')],
                            flags: [MessageFlags.Ephemeral]
                        });
                    }

                    const wordsFormatted = autoMod.bannedWords.map((w, i) => `**${i + 1}.** \`${w}\``).join('\n');
                    const embed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle(`${em.automod || '🚫'} قائمة الكلمات المحظورة (${autoMod.bannedWords.length})`.trim())
                        .setDescription(wordsFormatted)
                        .setFooter({ text: `EnzoSecurity • ${interaction.guild.name}` })
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });
                }

                if (sub === 'clear') {
                    const count = autoMod.bannedWords.length;
                    if (count === 0) {
                        return interaction.reply({ embeds: [infoEmbed('قائمة الكلمات المحظورة فارغة بالفعل.')], flags: [MessageFlags.Ephemeral] });
                    }

                    autoMod.bannedWords = [];
                    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                    logger.info(`AUTOMOD: All banned words cleared by ${interaction.user.tag}`);
                    return interaction.reply({
                        embeds: [successEmbed(`تم مسح كافة الكلمات المحظورة بالكامل (**${count}** كلمة).`)]
                    });
                }
            }

            if (sub === 'status') {
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`${em.automod || '🤖'} حالة نظام الرقابة التلقائية (AutoMod)`.trim())
                    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: 'حالة النظام العام', value: autoMod.enabled ? '🟢 **مفعل (Enabled)**' : '🔴 **معطل (Disabled)**', inline: true },
                        { name: 'مانع الروابط (Anti-Link)', value: autoMod.antiLink ? '🟢 **مفعل**' : '🔴 **معطل**', inline: true },
                        { name: 'مانع الدعوات (Anti-Invite)', value: autoMod.antiInvite ? '🟢 **مفعل**' : '🔴 **معطل**', inline: true },
                        { name: 'عدد الكلمات المحظورة', value: `**${autoMod.bannedWords.length}** كلمة`, inline: true }
                    )
                    .setFooter({ text: `EnzoSecurity • ${interaction.guild.name}` })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            if (sub === 'toggle') {
                const enable = interaction.options.getBoolean('enable');
                autoMod.enabled = enable;
                await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                logger.info(`AUTOMOD: Toggled to ${enable} by ${interaction.user.tag}`);
                return interaction.reply({
                    embeds: [successEmbed(`تم ${enable ? 'تفعيل 🟢' : 'تعطيل 🔴'} نظام الرقابة التلقائية (AutoMod) بنجاح.`)]
                });
            }

            if (sub === 'antilink') {
                const enable = interaction.options.getBoolean('enable');
                autoMod.antiLink = enable;
                if (enable) autoMod.enabled = true;
                await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                logger.info(`AUTOMOD: AntiLink set to ${enable} by ${interaction.user.tag}`);
                return interaction.reply({
                    embeds: [successEmbed(`تم ${enable ? 'تفعيل 🟢' : 'تعطيل 🔴'} مانع الروابط الخارجية (Anti-Link) بنجاح.`)]
                });
            }

            if (sub === 'antiinvite') {
                const enable = interaction.options.getBoolean('enable');
                autoMod.antiInvite = enable;
                if (enable) autoMod.enabled = true;
                await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { autoMod });

                logger.info(`AUTOMOD: AntiInvite set to ${enable} by ${interaction.user.tag}`);
                return interaction.reply({
                    embeds: [successEmbed(`تم ${enable ? 'تفعيل 🟢' : 'تعطيل 🔴'} مانع روابط دعوات الديسكورد (Anti-Invite) بنجاح.`)]
                });
            }

        } catch (error) {
            logger.error(`AutoMod Command Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء تعديل إعدادات الرقابة التلقائية.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
