const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../systems/logger.js');
const config = require('../../../config.json');

function parseEmoji(emojiStr) {
    if (!emojiStr) return undefined;
    const match = emojiStr.match(/<a?:(\\w+):(\\d+)>/);
    if (match) {
        return { name: match[1], id: match[2] };
    }
    return emojiStr;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة المساعدة والأوامر المتاحة')
        .addStringOption(option =>
            option.setName('category')
            .setDescription('فئة الأوامر')
            .setRequired(false)
            .addChoices(
                { name: 'الإدارة (moderation)', value: 'moderation' },
                { name: 'الأمان (security)', value: 'security' },
                { name: 'الإعداد (setup)', value: 'setup' },
                { name: 'عام (general)', value: 'general' }
            )),

    async execute(interaction) {
        try {
            const requestedCategory = interaction.options.getString('category');
            const em = config.emojis || {};
            const botUser = interaction.client.user;
            const botAvatar = botUser.displayAvatarURL({ dynamic: true });

            const categories = {
                moderation: {
                    title: 'أوامر الإدارة والإشراف',
                    description: 'مجموعة الأوامر الإدارية لضبط السيرفر والتحكم بالقنوات والمخالفين:',
                    emoji: parseEmoji(em.ban) || '🔨',
                    color: '#E67E22',
                    commands: [
                        { name: '/ban', desc: 'حظر عضو من السيرفر بشكل دائم مع خيار مسح الرسائل' },
                        { name: '/unban', desc: 'فك حظر عضو من السيرفر بواسطة المعرّف (User ID)' },
                        { name: '/kick', desc: 'طرد عضو من السيرفر' },
                        { name: '/timeout', desc: 'إسكات وعزل عضو لفترة زمنية محددة' },
                        { name: '/clear', desc: 'مسح عدد محدد من الرسائل من القناة' },
                        { name: '/slowmode', desc: 'تحديد أو إلغاء وضع التهدئة وتحديد سرعة الشات للقناة' },
                        { name: '/lock', desc: 'قفل قناة معينة ومنع الأعضاء من الكتابة فيها' },
                        { name: '/unlock', desc: 'فتح قناة مقفلة والسماح للأعضاء بالكتابة والمشاركة' },
                        { name: '/warn', desc: 'إرسال تحذير رسمي لعضو وتسجيله بالنظام' },
                        { name: '/delwarn', desc: 'حذف تحذير برقم ID أو مسح جميع تحذيرات عضو' },
                        { name: '/warnings', desc: 'عرض قائمة وسجل التحذيرات لعضو أو للسيرفر' }
                    ]
                },
                security: {
                    title: 'أنظمة الأمان والحماية',
                    description: 'محركات الحماية التلقائية وأنظمة الرقابة والتصدي للهجمات:',
                    emoji: parseEmoji(em.shield) || '🛡️',
                    color: '#ED4245',
                    commands: [
                        { name: '/lockdown', desc: 'قفل أو فتح قنوات السيرفر بالكامل في حالات الطوارئ' },
                        { name: '/antinuke', desc: 'حماية السيرفر من مسح القنوات، الرولات، أو الحظر الجماعي' },
                        { name: '/antiraid', desc: 'التصدي الفوري لهجمات الدخول الجماعي السريع والحسابات الوهمية' },
                        { name: '/antispam', desc: 'منع تكرار الرسائل وإغراق الشات والمنشن المزعج' },
                        { name: '/automod', desc: 'إدارة الرقابة التلقائية، فلتر الكلمات المحظورة، ومنع الروابط' },
                        { name: '/whitelist', desc: 'إدارة قائمة المستثنين من أنظمة الأمان والحماية' }
                    ]
                },
                setup: {
                    title: 'أوامر الإعداد والتجهيز',
                    description: 'أوامر تهيئة وتجهيز ميزات البوت والقنوات المخصصة:',
                    emoji: parseEmoji(em.log) || '⚙️',
                    color: '#57F287',
                    commands: [
                        { name: '/setlogs', desc: 'تحديد قناة إرسال سجلات الحماية والأمان الشاملة' },
                        { name: '/setverify', desc: 'إعداد وتفعيل نظام التحقق بالكابتشا التفاعلية (CAPTCHA)' },
                        { name: '/sethoneypot', desc: 'إنشاء قناة مصيدة لحظر البوتات المخربة فورياً' }
                    ]
                },
                general: {
                    title: 'الأوامر والمعلومات العامة',
                    description: 'أوامر الاستعلام وفحص حالة واستجابة البوت:',
                    emoji: parseEmoji(em.info) || 'ℹ️',
                    color: '#5865F2',
                    commands: [
                        { name: '/ping', desc: 'فحص سرعة استجابة البوت وقاعدة البيانات' },
                        { name: '/help', desc: 'عرض دليل المساعدة والقائمة التفاعلية للأوامر' }
                    ]
                }
            };

            const totalCmdCount = Object.values(categories).reduce((acc, cat) => acc + cat.commands.length, 0);

            const buildEmbed = (catKey) => {
                if (!catKey || catKey === 'overview') {
                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: `${botUser.username} — مركز الحماية والمساعدة`, iconURL: botAvatar })
                        .setTitle(`${em.shield || '🛡️'} دليل أوامر وأنظمة EnzoSecurity`.trim())
                        .setDescription(`مرحباً بك في نظام **EnzoSecurity** المتقدم لحماية وإدارة سيرفرات الديسكورد.\nاختر من القائمة المنسدلة بالأسفل لاستعراض تفاصيل أي فئة.\n\n📊 **إجمالي الأوامر:** \`${totalCmdCount} أمراً\` | 🛡️ **إصدار الحماية:** \`v1.0.0\``)
                        .setThumbnail(botAvatar)
                        .addFields(
                            {
                                name: `${em.ban || '🔨'} الإدارة والإشراف (${categories.moderation.commands.length})`.trim(),
                                value: '`/ban`, `/unban`, `/kick`, `/timeout`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/warn`, `/delwarn`, `/warnings`',
                                inline: false
                            },
                            {
                                name: `${em.shield || '🛡️'} الأمان والحماية (${categories.security.commands.length})`.trim(),
                                value: '`/lockdown`, `/antinuke`, `/antiraid`, `/antispam`, `/automod`, `/whitelist`',
                                inline: false
                            },
                            {
                                name: `${em.log || '⚙️'} الإعداد والتجهيز (${categories.setup.commands.length})`.trim(),
                                value: '`/setlogs`, `/setverify`, `/sethoneypot`',
                                inline: false
                            },
                            {
                                name: `${em.info || 'ℹ️'} عام ومعلومات (${categories.general.commands.length})`.trim(),
                                value: '`/ping`, `/help`',
                                inline: false
                            }
                        )
                        .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    return embed;
                }

                const cat = categories[catKey];
                if (!cat) return buildEmbed('overview');

                const embed = new EmbedBuilder()
                    .setColor(cat.color || '#5865F2')
                    .setAuthor({ name: `${botUser.username} — ${cat.title}`, iconURL: botAvatar })
                    .setTitle(`${cat.title}`)
                    .setDescription(cat.description)
                    .setThumbnail(botAvatar)
                    .setFooter({ text: `طلب بواسطة: ${interaction.user.tag} • ${cat.commands.length} أوامر`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                const cmdList = cat.commands.map(c => `**\`${c.name}\`** • ${c.desc}`).join('\n\n');
                embed.addFields({ name: 'الأوامر المتاحة:', value: cmdList, inline: false });
                return embed;
            };

            const buildMenu = (selectedKey = 'overview', disabled = false) => {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`help_menu_${interaction.id}`)
                    .setPlaceholder('اختر فئة الأوامر من القائمة...')
                    .setDisabled(disabled)
                    .addOptions([
                        {
                            label: 'نظرة عامة على البوت',
                            value: 'overview',
                            description: 'عرض جميع أقسام الحماية والخصائص الرئيسية',
                            emoji: parseEmoji(em.shield) || '🛡️',
                            default: selectedKey === 'overview'
                        },
                        {
                            label: 'الإدارة والإشراف',
                            value: 'moderation',
                            description: 'أوامر الحظر، الطرد، الإسكات، القفل، والتحذيرات',
                            emoji: parseEmoji(em.ban) || '🔨',
                            default: selectedKey === 'moderation'
                        },
                        {
                            label: 'الأمان والحماية',
                            value: 'security',
                            description: 'أنظمة الحماية ضد التدمير، الغارات، وفلتر الكلمات',
                            emoji: parseEmoji(em.shield) || '🔒',
                            default: selectedKey === 'security'
                        },
                        {
                            label: 'الإعداد والتجهيز',
                            value: 'setup',
                            description: 'تحديد قنوات السجلات، التحقق بالكابتشا، والمصيدة',
                            emoji: parseEmoji(em.log) || '⚙️',
                            default: selectedKey === 'setup'
                        },
                        {
                            label: 'عام ومعلومات',
                            value: 'general',
                            description: 'فحص سرعة الاستجابة ومعلومات البوت',
                            emoji: parseEmoji(em.info) || 'ℹ️',
                            default: selectedKey === 'general'
                        }
                    ]);

                return new ActionRowBuilder().addComponents(menu);
            };

            const initialKey = requestedCategory && categories[requestedCategory] ? requestedCategory : 'overview';
            const initialEmbed = buildEmbed(initialKey);
            const initialRow = buildMenu(initialKey);

            const response = await interaction.reply({
                embeds: [initialEmbed],
                components: [initialRow]
            });

            const collector = response.createMessageComponentCollector({
                filter: i => i.customId === `help_menu_${interaction.id}`,
                time: 120000
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '⚠️ هذه القائمة التفاعلية مخصصة فقط لمن طلب الأمر.',
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const selected = i.values[0];
                const updatedEmbed = buildEmbed(selected);
                const updatedRow = buildMenu(selected);

                await i.update({
                    embeds: [updatedEmbed],
                    components: [updatedRow]
                });
            });

            collector.on('end', async () => {
                const disabledRow = buildMenu('overview', true);
                await interaction.editReply({
                    components: [disabledRow]
                }).catch(() => null);
            });

        } catch (error) {
            logger.error(`Help Error: ${error.message}`);
            const errorPayload = { embeds: [errorEmbed('حدث خطأ أثناء عرض قائمة المساعدة.')], flags: [MessageFlags.Ephemeral] };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorPayload).catch(() => null);
            } else {
                await interaction.reply(errorPayload).catch(() => null);
            }
        }
    }
};
