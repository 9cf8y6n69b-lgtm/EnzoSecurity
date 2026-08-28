const { EmbedBuilder, WebhookClient } = require('discord.js');
const Guild = require('../database/models/Guild');
const AuditLog = require('../database/models/AuditLog');

class Logger {
    error(message) {
        console.error(`[LOGGER ERROR] ${message}`);
    }

    info(message) {
        console.log(`[LOGGER INFO] ${message}`);
    }

    warn(message) {
        console.warn(`[LOGGER WARN] ${message}`);
    }

    async log(guild, type, data = {}) {
        if (!guild) return;
        const guildId = typeof guild === 'string' ? guild : (guild.id ? String(guild.id) : null);
        if (!guildId) return;

        let settings = null;
        let webhookUrl = null;
        try {
            settings = await Guild.getOrCreate(guildId);
            webhookUrl = settings?.webhookUrl;
        } catch (err) {
            console.error('[LOGGER] Failed to fetch guild settings:', err.message);
        }

        try {
            const targetId = data?.target?.id || (typeof data?.target === 'string' ? data.target : (data?.targetId || (typeof data?.target?.tag === 'string' ? data.target.tag : null)));
            const executorId = data?.executor?.id || (typeof data?.executor === 'string' ? data.executor : null) || data?.executorId || data?.inviter?.id || (typeof data?.executor?.tag === 'string' ? data.executor.tag : null);

            await AuditLog.create({
                guildId: guildId,
                action: type,
                targetId: targetId,
                executorId: executorId,
                reason: data?.reason || null,
                details: data?.details ? { info: data.details } : null
            });
        } catch (err) {
            console.error('[LOGGER] Failed to save audit log:', err.message);
        }

        let targetChannelId = null;

        if (['ANTI_RAID', 'ANTI_SPAM', 'ANTI_NUKE', 'ANTI_BOT', 'ANTI_ALT', 'BEAST_MODE_ACTIVATED', 'BEAST_PUNISHMENT', 'LOCKDOWN', 'CHANNEL_CREATE', 'CHANNEL_DELETE', 'CHANNEL_UPDATE', 'ROLE_CREATE', 'ROLE_DELETE', 'ROLE_UPDATE', 'PHISHING_DETECTED', 'TOKEN_LEAK_DETECTED', 'SCAM_IMAGE_DETECTED', 'STAFF_ABUSE_ALERT', 'HONEYPOT_TRIGGERED'].includes(type)) {
            targetChannelId = settings?.securityLogChannelId || settings?.logChannelId;
        } else if (['BAN', 'KICK', 'TIMEOUT', 'WARN', 'WARN_DELETE', 'MEMBER_BAN_ADD', 'MEMBER_UNBAN'].includes(type)) {
            targetChannelId = settings?.modLogChannelId || settings?.logChannelId;
        } else if (['AUTO_MOD', 'AUTO_MODERATION', 'MESSAGE_DELETE', 'MESSAGE_UPDATE'].includes(type)) {
            targetChannelId = settings?.automodLogChannelId || settings?.securityLogChannelId || settings?.logChannelId;
        } else if (['MEMBER_JOIN', 'MEMBER_LEAVE', 'VERIFY', 'INVITE_CREATE', 'INVITE_DELETE'].includes(type)) {
            targetChannelId = settings?.joinLeaveLogChannelId || settings?.logChannelId;
        } else {
            targetChannelId = settings?.logChannelId;
        }

        const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `EnzoSecurity • ${guild.name}`, iconURL: guild.iconURL() });
        const unixTime = Math.floor(Date.now() / 1000);
        const config = require('../../config.json');
        const em = config.emojis || {};

        const formatUser = (userObj) => {
            if (!userObj) return 'غير محدد / النظام التلقائي';
            const tag = userObj.tag || userObj.user?.tag || userObj.id || userObj;
            const id = userObj.id || userObj;
            return `${tag}\n<@${id}>\n\`ID: ${id}\``;
        };

        const getAvatar = (userObj) => {
            if (userObj?.displayAvatarURL) return userObj.displayAvatarURL({ dynamic: true });
            if (userObj?.user?.displayAvatarURL) return userObj.user.displayAvatarURL({ dynamic: true });
            return null;
        };

        switch (type) {

            case 'MEMBER_JOIN': {
                const targetUser = data.target;
                const inviterMention = data.inviter ? `<@${data.inviter.id}> (${data.inviter.tag})` : 'غير معروف / رابط خاص';
                const inviteCodeInfo = data.inviteCode ? `\`${data.inviteCode}\` (استُخدمت ${data.inviteUses || 1} مرة)` : 'غير متاح';
                const accountAgeText = data.accountAgeDays !== undefined ? `${data.accountAgeDays} أيام` : 'غير محدد';
                const createdTimeText = data.createdUnix ? `<t:${data.createdUnix}:F> (<t:${data.createdUnix}:R>)` : 'غير محدد';

                embed.setColor('#57F287')
                    .setTitle(`${em.join || ''} انضمام عضو جديد (Member Joined)`.trim())
                    .setThumbnail(getAvatar(targetUser))
                    .addFields(
                        { name: 'العضو المنضم', value: formatUser(targetUser), inline: true },
                        { name: 'الداعي ورابط الدعوة', value: `الداعي: ${inviterMention}\nرابط الدعوة: ${inviteCodeInfo}`, inline: true },
                        { name: 'تاريخ إنشاء الحساب', value: `${createdTimeText}\nالعمر: **${accountAgeText}**`, inline: false },
                        { name: 'إجمالي أعضاء السيرفر', value: `**${data.memberCount || guild.memberCount}** أعضاء`, inline: true },
                        { name: 'وقت الانضمام', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'MEMBER_LEAVE': {
                const targetUser = data.target;
                const joinedTimeText = data.joinedUnix ? `<t:${data.joinedUnix}:F> (<t:${data.joinedUnix}:R>)` : 'غير محدد';
                const stayedText = data.stayedDays !== undefined ? `${data.stayedDays} أيام` : 'غير محدد';
                const rolesText = data.rolesText || 'بدون رولات';
                const remainingMembers = data.memberCount || guild.memberCount;

                embed.setColor('#95A5A6')
                    .setTitle(`${em.leave || ''} مغادرة عضو من السيرفر (Member Left)`.trim())
                    .setThumbnail(getAvatar(targetUser))
                    .addFields(
                        { name: 'العضو المغادر', value: formatUser(targetUser), inline: true },
                        { name: 'تاريخ ووقت الانضمام للسيرفر', value: `${joinedTimeText}\nمدة البقاء بالسيرفر: **${stayedText}**`, inline: false },
                        { name: 'الرولات السابقة', value: `\`\`\`${rolesText}\`\`\``, inline: false },
                        { name: 'الأعضاء المتبقين بالسيرفر', value: `**${remainingMembers}** أعضاء`, inline: true },
                        { name: 'وقت المغادرة', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'ANTI_RAID': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.raid || ''} رصد هجوم غارات كاسح (Anti-Raid Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'آخر عضو منضم', value: formatUser(data.target), inline: true },
                        { name: 'الإجراء المتخذ', value: `**${data.details?.actionTaken || 'طرد المهاجمين'}**`, inline: true },
                        { name: 'نقاط التهديد للنافذة', value: `**${data.details?.joinsInWindow || 'مكثف'}** انضمام متتابع`, inline: true },
                        { name: 'السبب والتفاصيل', value: data.reason || 'تجاوز حد الانضمام السريع الجماعي (Mass Join Attack)', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'ANTI_SPAM': {
                embed.setColor('#FEE75C')
                    .setTitle(`${em.spam || ''} رصد تكرار وإغراق رسائل (Anti-Spam Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو المخالف', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'قناة نصية', inline: true },
                        { name: 'الإجراء المتخذ', value: '**مسح الرسائل التكرارية فورياً**', inline: true },
                        { name: 'محتوى الرسالة المكررة', value: data.content ? `\`\`\`${data.content.slice(0, 300)}\`\`\`` : 'رسالة تكرارية مكثفة', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'ANTI_NUKE': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.nuke || ''} رصد محاولة تخريب سيرفر (Anti-Nuke Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target || data.executor))
                    .addFields(
                        { name: 'المشرف المخالف (المخرب)', value: formatUser(data.target || data.executor), inline: true },
                        { name: 'العقوبة التلقائية', value: '**تجريد وسحب جميع الرولات والصلاحيات فوراً**', inline: true },
                        { name: 'نوع الإجراء المخرب', value: data.reason || 'تجاوز الحد المسموح للأفعال الحساسة (حذف قنوات/رولات/حظر mass)', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'ANTI_BOT': {
                embed.setColor('#3498DB')
                    .setTitle(`${em.bot || ''} رصد إضافة بوت غير مصرح به (Anti-Bot Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'البوت المضاف', value: formatUser(data.target), inline: true },
                        { name: 'الشخص الذي أضاف البوت', value: formatUser(data.executor), inline: true },
                        { name: 'الإجراء المتخذ', value: `**${data.reason || 'طرد البوت فورياً'}**`, inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'ANTI_ALT': {
                embed.setColor('#E67E22')
                    .setTitle(`${em.alt || ''} رصد دخول حساب حديث / وهمي (Anti-Alt Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'الحساب المشبوه', value: formatUser(data.target), inline: true },
                        { name: 'عمر الحساب الحالي', value: `**${data.accountAgeDays || 0}** أيام (الحد الأدنى: ${data.minAgeDays || 7} أيام)`, inline: true },
                        { name: 'الإجراء المتخذ', value: `**${data.reason || 'طرد الحساب'}**`, inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'BEAST_MODE_ACTIVATED': {
                embed.setColor('#f54e00')
                    .setTitle(`${em.beast || ''} تفعيل وضع الوحش والطوارئ (Beast Mode Activated)`.trim())
                    .addFields(
                        { name: 'نقاط التهديد التراكمية', value: `**تم تجاوز حد الأمان كلياً**`, inline: true },
                        { name: 'مدة تفعيل الوضع', value: '**ساعة واحدة (1 Hour)**', inline: true },
                        { name: 'سياسة وضع الوحش', value: 'أي فعل مشبوه إضافي يستوجب **تجريد الرولات أو الحظر الفوري** دون إنذار.', inline: false },
                        { name: 'توقيت التفعيل', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'BEAST_PUNISHMENT': {
                embed.setColor('#f54e00')
                    .setTitle(`${em.beast || ''} عقوبة فورية أثناء وضع الوحش (Beast Punishment)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو المعاقب', value: formatUser(data.target), inline: true },
                        { name: 'العقوبة الصارمة', value: '**سحب وتجريد كافة الرولات فورياً**', inline: true },
                        { name: 'السبب', value: data.reason || 'القيام بـ فعل مشبوه أثناء تفعيل حالة وضع الوحش بالسيرفر.', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'AUTO_MOD': {
                embed.setColor('#E74C3C')
                    .setTitle(`🚫 رصد مخالفة مصفاة الرقابة التلقائية (Auto-Mod Triggered)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المخالف', value: formatUser(data.target), inline: true },
                        { name: '📌 القناة', value: data.channel ? `<#${data.channel.id}>` : 'قناة نصية', inline: true },
                        { name: '📝 نوع المخالفة', value: data.reason || 'محيط كلمة محظورة أو رابط غير مسموح', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'BAN': {
                embed.setColor('#E67E22')
                    .setTitle(`${em.ban || '🔨'} حظر عضو من السيرفر (Member Banned)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المحظور', value: formatUser(data.target), inline: true },
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '📝 سبب الحظر', value: data.reason || 'لم يتم تقديم سبب', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'KICK': {
                embed.setColor('#E67E22')
                    .setTitle(`${em.kick || '👢'} طرد عضو من السيرفر (Member Kicked)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المطاني', value: formatUser(data.target), inline: true },
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '📝 سبب الطرد', value: data.reason || 'لم يتم تقديم سبب', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'TIMEOUT': {
                embed.setColor('#3498DB')
                    .setTitle(`${em.timeout || '⏳'} إسكات وعزل عضو (Member Timeout)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المعزول', value: formatUser(data.target), inline: true },
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '📝 مدة الإسكات والسبب', value: data.reason || 'لم يتم تقديم سبب', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'WARN': {
                embed.setColor('#FEE75C')
                    .setTitle(`${em.warning || '⚠️'} تسجيل تحذير تنبيهي (User Warned)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المحذر', value: formatUser(data.target), inline: true },
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '📝 سبب التحذير', value: data.reason || 'لم يتم تقديم سبب', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'WARN_DELETE': {
                embed.setColor('#57F287')
                    .setTitle(`${em.delete || '🗑️'} حذف تحذير (Warning Removed)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المستهدف', value: formatUser(data.target), inline: true },
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '📝 التفاصيل', value: data.reason || 'تم حذف التحذير', inline: false },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'VERIFY': {
                embed.setColor('#57F287')
                    .setTitle(`${em.shield || '✅'} تم تفعيل حساب العضو (Member Verified)`)
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: '👤 العضو المفعل', value: formatUser(data.target), inline: true },
                        { name: '🛡️ طريقة التفعيل', value: 'زر التفعيل السريع (One-Click Verification)', inline: true },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'LOCKDOWN': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.lock || '🔒'} تغيير حالة وضع إغلاق السيرفر (Lockdown Update)`)
                    .addFields(
                        { name: '🛡️ المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: '🔒 الحالة الجديدة', value: data.reason || 'تعديل وضع الإغلاق للسيرفر', inline: true },
                        { name: '⏱️ التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'INVITE_CREATE': {
                embed.setColor('#3498DB')
                    .setTitle(`${em.invite || ''} إنشاء رابط دعوة جديد (Invite Created)`.trim())
                    .setThumbnail(getAvatar(data.executor))
                    .addFields(
                        { name: 'منشئ الدعوة', value: formatUser(data.executor), inline: true },
                        { name: 'رابط الدعوة', value: `\`${data.inviteCode}\`\n${data.inviteUrl || ''}`, inline: true },
                        { name: 'القناة المستهدفة', value: data.targetChannel || 'غير محدد', inline: true },
                        { name: 'مدة الصلاحية', value: data.maxAge || 'غير محدد', inline: true },
                        { name: 'الحد الأقصى للاستخدام', value: data.maxUses || 'غير محدود', inline: true },
                        { name: 'عضوية مؤقتة', value: data.temporary || 'لا', inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'INVITE_DELETE': {
                embed.setColor('#95A5A6')
                    .setTitle(`${em.delete || ''} حذف رابط دعوة (Invite Deleted)`.trim())
                    .addFields(
                        { name: 'كود الدعوة المحذوف', value: `\`${data.inviteCode || 'غير معروف'}\``, inline: true },
                        { name: 'القناة', value: data.targetChannel || 'غير محدد', inline: true },
                        { name: 'عدد مرات الاستخدام', value: `**${data.uses || 0}** مرة`, inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'CHANNEL_CREATE': {
                embed.setColor('#57F287')
                    .setTitle(`${em.channel || ''} إنشاء قناة جديدة (Channel Created)`.trim())
                    .addFields(
                        { name: 'القناة', value: data.channelMention || 'غير محدد', inline: true },
                        { name: 'اسم القناة', value: `\`${data.channelName || 'غير محدد'}\``, inline: true },
                        { name: 'النوع', value: data.channelType || 'غير محدد', inline: true },
                        { name: 'الفئة', value: data.category || 'بدون فئة', inline: true },
                        { name: 'المنشئ', value: formatUser(data.executor), inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'CHANNEL_DELETE': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.delete || ''} حذف قناة من السيرفر (Channel Deleted)`.trim())
                    .addFields(
                        { name: 'اسم القناة المحذوفة', value: `\`${data.channelName || 'غير محدد'}\``, inline: true },
                        { name: 'النوع', value: data.channelType || 'غير محدد', inline: true },
                        { name: 'الفئة', value: data.category || 'بدون فئة', inline: true },
                        { name: 'معرّف القناة', value: `\`${data.channelId || 'غير محدد'}\``, inline: true },
                        { name: 'من حذفها', value: formatUser(data.executor), inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'CHANNEL_UPDATE': {
                embed.setColor('#3498DB')
                    .setTitle(`${em.edit || ''} تعديل قناة (Channel Updated)`.trim())
                    .addFields(
                        { name: 'القناة', value: data.channelMention || 'غير محدد', inline: true },
                        { name: 'المعدّل', value: formatUser(data.executor), inline: true },
                        { name: 'التغييرات', value: data.changes ? `\`\`\`${data.changes}\`\`\`` : 'تغييرات متعددة', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'ROLE_CREATE': {
                embed.setColor('#57F287')
                    .setTitle(`${em.role || ''} إنشاء رول جديد (Role Created)`.trim())
                    .addFields(
                        { name: 'الرول', value: data.roleMention || `\`${data.roleName}\``, inline: true },
                        { name: 'اللون', value: `\`${data.roleColor || '#000000'}\``, inline: true },
                        { name: 'المنشئ', value: formatUser(data.executor), inline: true },
                        { name: 'منشنابل', value: data.mentionable || 'لا', inline: true },
                        { name: 'مميز (Hoisted)', value: data.hoisted || 'لا', inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'ROLE_DELETE': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.delete || ''} حذف رول من السيرفر (Role Deleted)`.trim())
                    .addFields(
                        { name: 'اسم الرول المحذوف', value: `\`${data.roleName || 'غير محدد'}\``, inline: true },
                        { name: 'اللون', value: `\`${data.roleColor || '#000000'}\``, inline: true },
                        { name: 'من حذفه', value: formatUser(data.executor), inline: true },
                        { name: 'المعرّف', value: `\`${data.roleId || 'غير محدد'}\``, inline: true },
                        { name: 'عدد الأعضاء بالرول', value: `**${data.memberCount || 0}** عضو`, inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'ROLE_UPDATE': {
                embed.setColor('#3498DB')
                    .setTitle(`${em.edit || ''} تعديل رول (Role Updated)`.trim())
                    .addFields(
                        { name: 'الرول', value: data.roleMention || `\`${data.roleName}\``, inline: true },
                        { name: 'المعدّل', value: formatUser(data.executor), inline: true },
                        { name: 'التغييرات', value: data.changes ? `\`\`\`${data.changes}\`\`\`` : 'تغييرات متعددة', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: false }
                    );
                break;
            }

            case 'MESSAGE_DELETE': {
                const contentPreview = data.content ? data.content.slice(0, 800) : 'لا يوجد محتوى نصي';
                embed.setColor('#E74C3C')
                    .setTitle(`${em.delete || ''} حذف رسالة (Message Deleted)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'كاتب الرسالة', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'محتوى الرسالة', value: `\`\`\`${contentPreview}\`\`\``, inline: false }
                    );
                if (data.attachments) {
                    embed.addFields({ name: 'المرفقات', value: data.attachments, inline: false });
                }
                embed.addFields({ name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true });
                break;
            }

            case 'MESSAGE_UPDATE': {
                const oldPreview = data.oldContent ? data.oldContent.slice(0, 400) : 'لا يوجد';
                const newPreview = data.newContent ? data.newContent.slice(0, 400) : 'لا يوجد';
                embed.setColor('#FEE75C')
                    .setTitle(`${em.edit || ''} تعديل رسالة (Message Edited)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'كاتب الرسالة', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'المحتوى القديم', value: `\`\`\`${oldPreview}\`\`\``, inline: false },
                        { name: 'المحتوى الجديد', value: `\`\`\`${newPreview}\`\`\``, inline: false },
                        { name: 'رابط الرسالة', value: data.messageUrl ? `[اضغط هنا](${data.messageUrl})` : 'غير متاح', inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'MEMBER_BAN_ADD': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.ban || ''} حظر عضو (Member Banned)`.trim())
                    .setThumbnail(getAvatar(data.user || data.target))
                    .addFields(
                        { name: 'العضو المحظور', value: formatUser(data.user || data.target), inline: true },
                        { name: 'السبب', value: data.reason || 'لم يتم تقديم سبب', inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'MEMBER_UNBAN': {
                embed.setColor('#57F287')
                    .setTitle(`${em.unban || ''} فك حظر عضو (Member Unbanned)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو', value: formatUser(data.target), inline: true },
                        { name: 'السبب', value: data.reason || 'لم يتم تقديم سبب', inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'AUTO_MODERATION': {
                if (data.embed) {

                    const channel = targetChannelId ? guild.channels.cache.get(targetChannelId) : null;
                    if (channel) {
                        try { await channel.send({ embeds: [data.embed] }); } catch (err) {}
                    }
                    return;
                }
                embed.setColor('#E74C3C')
                    .setTitle(`${em.automod || em.shield || ''} إشعار AutoMod`.trim())
                    .addFields(
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'PHISHING_DETECTED': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.shield || ''} رصد رابط تصيّد / نيترو مزيّف (Phishing Detected)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو المنسق / المخالف', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'الإجراء المتخذ', value: '**حذف الرسالة فورياً فور الرصد**', inline: true },
                        { name: 'الرابط / النمط المرصود', value: `\`${data.matchedUrl || 'رابط مشبوه'}\``, inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'TOKEN_LEAK_DETECTED': {
                embed.setColor('#FEE75C')
                    .setTitle(`${em.lock || ''} رصد تسريب توكن / مفتاح حساس (Token Leak Intercepted)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو الذي نشر التوكن', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'نوع المفتاح المرصود', value: `\`${data.tokenType || 'توكن حساس'}\``, inline: true },
                        { name: 'الإجراء المتخذ لحماية التوكن', value: '**مسح الرسالة فورياً + إرسال تحذير تنبيهي خاص (DM)**', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'SCAM_IMAGE_DETECTED': {
                embed.setColor('#9B59B6')
                    .setTitle(`${em.spam || ''} رصد صورة / GIF احتيال وسكام (Scam Image Intercepted)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'العضو الناشر', value: formatUser(data.target), inline: true },
                        { name: 'القناة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'نوع الاحتيال المرصود', value: data.reason || 'سكام مستر بيست / QR Code نيترو', inline: false },
                        { name: 'الإجراء المتخذ', value: `**${data.actionTaken || 'حذف الصورة'}**`, inline: true },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'STAFF_ABUSE_ALERT': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.warning || em.shield || ''} تنبيه عاجل: كشف تعسف مشرفين (Staff Abuse Alert)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'المشرف المنفذ', value: formatUser(data.executor), inline: true },
                        { name: 'الحساب المستهدف', value: formatUser(data.target), inline: true },
                        { name: 'عمر الحساب المستهدف', value: `**${data.accountAgeDays || 0}** أيام`, inline: true },
                        { name: 'الرول الممنوح', value: `\`${data.roleName || 'رول حساس'}\``, inline: true },
                        { name: 'مستوى الخطورة', value: `**${data.severity || 'HIGH'}**`, inline: true },
                        { name: 'التفاصيل', value: data.reason || 'منح صلاحيات أدمن لحساب حديث', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            case 'HONEYPOT_TRIGGERED': {
                embed.setColor('#ED4245')
                    .setTitle(`${em.nuke || em.shield || ''} رصد وقوع في مصيدة التخريب (Honeypot Triggered)`.trim())
                    .setThumbnail(getAvatar(data.target))
                    .addFields(
                        { name: 'المخرب / البوت المرصود', value: formatUser(data.target), inline: true },
                        { name: 'قناة المصيدة', value: data.channel ? `<#${data.channel.id}>` : 'غير محدد', inline: true },
                        { name: 'الإجراء الفوري المتخذ', value: `**${data.actionTaken || 'حظر دائم فوري'}**`, inline: true },
                        { name: 'محتوى الرسالة المرصودة', value: data.content ? `\`\`\`${data.content.slice(0, 300)}\`\`\`` : 'محتوى محذوف', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }

            default: {
                embed.setColor('#5865F2')
                    .setTitle(`${em.info || 'ℹ️'} ${type.replace('_', ' ')}`)
                    .addFields(
                        { name: 'الشخص', value: formatUser(data.target), inline: true },
                        { name: 'المنفذ', value: formatUser(data.executor), inline: true },
                        { name: 'التفاصيل', value: data.reason || 'لا توجد تفاصيل إضافية', inline: false },
                        { name: 'التوقيت', value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`, inline: true }
                    );
                break;
            }
        }

        if (targetChannelId) {
            const channel = guild.channels.cache.get(targetChannelId);
            if (channel) {
                try {
                    await channel.send({ embeds: [embed] });
                } catch (err) {
                    console.error(`[LOGGER] Failed to send log to channel ${targetChannelId}:`, err.message);
                }
            }
        }

        if (webhookUrl && webhookUrl.startsWith('http')) {
            try {
                const webhookClient = new WebhookClient({ url: webhookUrl });
                await webhookClient.send({ embeds: [embed] });
            } catch (err) {
                console.error('[LOGGER] Webhook forwarding error:', err.message);
            }
        }
    }
}

module.exports = new Logger();
