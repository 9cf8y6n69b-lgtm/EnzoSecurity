const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(option => option.setName('user').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('سبب الحظر').setRequired(false))
        .addIntegerOption(option => option.setName('delete_days').setDescription('عدد أيام مسح الرسائل (0-7)').setRequired(false).setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';
            const deleteDays = interaction.options.getInteger('delete_days') || 0;

            if (user.id === interaction.user.id) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك حظر نفسك.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.guild.ownerId) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك حظر مالك السيرفر.')], flags: [MessageFlags.Ephemeral] });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (member) {
                if (!member.bannable || (interaction.user.id !== interaction.guild.ownerId && interaction.member.roles.highest.position <= member.roles.highest.position)) {
                    return interaction.reply({ embeds: [errorEmbed('لا يمكنني حظر هذا العضو بسبب الرتبة أو الصلاحيات.')], flags: [MessageFlags.Ephemeral] });
                }
            }

            await interaction.guild.members.ban(user.id, { deleteMessageSeconds: deleteDays * 86400, reason: reason });
            logger.info(`BAN: ${user.tag} was banned by ${interaction.user.tag}. Reason: ${reason}`);

            await interaction.reply({ embeds: [successEmbed(`تم حظر العضو **${user.tag}** بنجاح.\nالسبب: ${reason}`)] });
        } catch (error) {
            logger.error(`Ban Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء محاولة حظر العضو.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
