const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const Guild = require('../database/models/Guild');
const logger = require('./logger');

class Verification {
    constructor() {
        this.pending = new Map();
        this.SESSION_TTL = 300000;
    }

    generateCaptcha() {
        const type = Math.random() > 0.5 ? 'math' : 'code';
        if (type === 'math') {
            const operations = ['+', '-', 'x'];
            const op = operations[Math.floor(Math.random() * operations.length)];
            let num1, num2, answer, question;
            if (op === '+') {
                num1 = Math.floor(Math.random() * 50) + 10;
                num2 = Math.floor(Math.random() * 50) + 10;
                answer = (num1 + num2).toString();
                question = `احسب الناتج: ${num1} + ${num2} = ?`;
            } else if (op === '-') {
                num1 = Math.floor(Math.random() * 50) + 30;
                num2 = Math.floor(Math.random() * 25) + 5;
                answer = (num1 - num2).toString();
                question = `احسب الناتج: ${num1} - ${num2} = ?`;
            } else {
                num1 = Math.floor(Math.random() * 9) + 2;
                num2 = Math.floor(Math.random() * 9) + 2;
                answer = (num1 * num2).toString();
                question = `احسب الناتج: ${num1} × ${num2} = ?`;
            }
            return { answer, question, placeholder: 'اكتب الناتج بالأرقام هنا (مثال: 42)' };
        } else {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return {
                answer: code.toUpperCase(),
                question: `اكتب الرمز الأمني: [${code}]`,
                placeholder: `اكتب الرمز ${code} هنا بدون مسافات`
            };
        }
    }

    async sendVerification(member, guildSettings) {
        if (!member || !member.guild) return;
        if (!guildSettings) {
            guildSettings = await Guild.getOrCreate(member.guild.id);
        }
        const verifyChannelId = guildSettings?.verifyChannelId;
        if (!verifyChannelId) return;

        const channel = member.guild.channels?.cache?.get(verifyChannelId) || (typeof member.guild.channels?.fetch === 'function' ? await member.guild.channels.fetch(verifyChannelId).catch(() => null) : null);
        if (!channel) return;

        const config = require('../../config.json');
        const em = config.emojis || {};

        const embed = new EmbedBuilder()
            .setTitle(`${em.shield || '🛡️'} نظام التحقق والأمان (Server Verification)`.trim())
            .setDescription(`مرحباً بك في **${member.guild.name}**!\nللحصول على صلاحيات الدخول والتفاعل مع السيرفر، يرجى الضغط على زر التحقق بالأسفل وحل مسألة الأمان السريعة (CAPTCHA).`)
            .setColor('#57F287')
            .setFooter({ text: 'EnzoSecurity • نظام مكافحة البوتات التلقائي', iconURL: member.guild.iconURL() })
            .setTimestamp();

        const btn = new ButtonBuilder()
            .setCustomId('verify_button')
            .setLabel('تأكيد الهوية ودخول السيرفر (Verify)')
            .setStyle(ButtonStyle.Success);

        if (em.success) {
            const match = em.success.match(/<a?:(\\w+):(\\d+)>/);
            if (match) {
                btn.setEmoji({ name: match[1], id: match[2] });
            }
        }

        const row = new ActionRowBuilder().addComponents(btn);

        try {
            await channel.send({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[VERIFICATION] Failed to send verification message:', err.message);
        }
    }

    async handleVerification(interaction, guildSettings) {
        if (!interaction || !interaction.user) return;

        if (!guildSettings && interaction.guild) {
            try {
                guildSettings = await Guild.getOrCreate(interaction.guild.id);
            } catch (err) {}
        }

        const verifyRoleId = guildSettings?.verifiedRoleId;
        if (verifyRoleId && interaction.member?.roles?.cache?.has(verifyRoleId)) {
            return interaction.reply({
                content: '✅ **أنت مفعل وموثق بالفعل في هذا السيرفر!** لديك حق الوصول الكامل لكافة القنوات.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const captcha = this.generateCaptcha();
        const userId = interaction.user.id;

        if (this.pending.has(userId)) {
            const existing = this.pending.get(userId);
            if (existing?.timer) clearTimeout(existing.timer);
        }

        const timer = setTimeout(() => {
            this.pending.delete(userId);
        }, this.SESSION_TTL);
        if (typeof timer.unref === 'function') timer.unref();

        this.pending.set(userId, {
            answer: captcha.answer,
            attempts: 0,
            timestamp: Date.now(),
            timer
        });

        const modal = new ModalBuilder()
            .setCustomId('verify_modal')
            .setTitle('🔐 التحقق الأمني (Security Check)');

        const answerInput = new TextInputBuilder()
            .setCustomId('verify_answer')
            .setLabel(captcha.question.slice(0, 45))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(captcha.placeholder)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10);

        const firstActionRow = new ActionRowBuilder().addComponents(answerInput);
        modal.addComponents(firstActionRow);

        if (typeof interaction.showModal === 'function') {
            await interaction.showModal(modal);
        }
    }

    async processVerification(interaction, guildSettings) {
        if (!interaction || !interaction.user) return;
        const userId = interaction.user.id;
        const pendingData = this.pending.get(userId);

        if (!pendingData || (Date.now() - pendingData.timestamp > this.SESSION_TTL)) {
            if (pendingData?.timer) clearTimeout(pendingData.timer);
            this.pending.delete(userId);
            return interaction.reply({ content: '⚠️ انتهت مهلة جلسة التحقق. يرجى الضغط على زر التحقق مرة أخرى.', flags: [MessageFlags.Ephemeral] });
        }

        const userAnswer = (interaction.fields?.getTextInputValue?.('verify_answer') || '').trim().toUpperCase();

        if (userAnswer === pendingData.answer.toUpperCase()) {
            if (pendingData.timer) clearTimeout(pendingData.timer);
            this.pending.delete(userId);

            if (!guildSettings && interaction.guild) {
                try {
                    guildSettings = await Guild.getOrCreate(interaction.guild.id);
                } catch (err) {
                    console.error('[VERIFICATION] DB Error:', err.message);
                }
            }

            const verifyRoleId = guildSettings?.verifiedRoleId;
            if (verifyRoleId && interaction.guild?.roles) {
                const role = interaction.guild.roles.cache.get(verifyRoleId);
                if (role && interaction.member && interaction.member.roles) {
                    try {
                        await interaction.member.roles.add(role, 'User successfully completed CAPTCHA verification');
                    } catch (err) {
                        console.error('[VERIFICATION] Failed to add verified role:', err.message);
                    }
                }
            }

            await logger.log(interaction.guild, 'VERIFY', {
                target: interaction.user,
                executor: { tag: 'نظام التحقق بالكابتشا (CAPTCHA)' },
                reason: 'حل الكابتشا التفاعلية بنجاح ومنحه رول التفعيل'
            });

            const config = require('../../config.json');
            const em = config.emojis || {};

            const successEmbed = new EmbedBuilder()
                .setTitle(`${em.success || '✅'} تم تأكيد حسابك بنجاح!`.trim())
                .setDescription(`مرحباً بك في **${interaction.guild.name}**!\nتم التحقق من هويتك بنجاح ومنحك رول التفعيل. نتمنى لك وقتاً ممتعاً!`)
                .setColor('#57F287')
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: [MessageFlags.Ephemeral] });
        } else {
            pendingData.attempts += 1;
            const config = require('../../config.json');
            const em = config.emojis || {};

            if (pendingData.attempts >= 3) {
                if (pendingData.timer) clearTimeout(pendingData.timer);
                this.pending.delete(userId);

                if (interaction.member && interaction.member.kickable) {
                    try {
                        await interaction.member.kick('فشل في حل اختبار الكابتشا بعد 3 محاولات متتالية.');
                    } catch (err) {
                        console.error('[VERIFICATION] Kick failed:', err.message);
                    }
                    return interaction.reply({ content: '🚫 لقد استنفدت جميع المحاولات (3 محاولات خاطئة) وتم طردك من السيرفر كإجراء أمني احترازي.', flags: [MessageFlags.Ephemeral] });
                }
            }

            await interaction.reply({
                content: `${em.error || '❌'} إجابة غير صحيحة! يتبقى لديك **${3 - pendingData.attempts}** محاولات. يرجى الضغط على زر التحقق مجدداً وحل المسألة الجديدة بعناية.`.trim(),
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
}

module.exports = new Verification();
