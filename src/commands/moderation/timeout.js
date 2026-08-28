const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('إسكات / عزل عضو لفترة زمنية محددة')
        .addUserOption(option => option.setName('user').setDescription('العضو المراد إسكاته').setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
            .setDescription('مدة الإسكات والعزل')
            .setRequired(true)
            .addChoices(
                { name: '60 ثانية (60s)', value: '60s' },
                { name: '5 دقائق (5m)', value: '5m' },
                { name: '10 دقائق (10m)', value: '10m' },
                { name: '30 دقيقة (30m)', value: '30m' },
                { name: 'ساعة واحدة (1h)', value: '1h' },
                { name: '6 ساعات (6h)', value: '6h' },
                { name: '12 ساعة (12h)', value: '12h' },
                { name: 'يوم واحد (1d)', value: '1d' },
                { name: '7 أيام (7d)', value: '7d' }
            ))
        .addStringOption(option => option.setName('reason').setDescription('سبب الإسكات').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const duration = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';

            if (user.bot) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك إسكات البوتات.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.user.id) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك إسكات نفسك.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.guild.ownerId) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك إسكات مالك السيرفر.')], flags: [MessageFlags.Ephemeral] });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ embeds: [errorEmbed('العضو غير موجود في السيرفر.')], flags: [MessageFlags.Ephemeral] });

            if (!member.moderatable || (interaction.user.id !== interaction.guild.ownerId && interaction.member.roles.highest.position <= member.roles.highest.position)) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنني إسكات هذا العضو بسبب الرتبة أو الصلاحيات.')], flags: [MessageFlags.Ephemeral] });
            }

            const timeMs = ms(duration);
            await member.timeout(timeMs, reason);
            logger.info(`TIMEOUT: ${user.tag} timed out for ${duration} by ${interaction.user.tag}. Reason: ${reason}`);

            await interaction.reply({ embeds: [successEmbed(`تم إسكات العضو **${user.tag}** لمدة ${duration}.\nالسبب: ${reason}`)] });
        } catch (error) {
            logger.error(`Timeout Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء محاولة إسكات العضو.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
