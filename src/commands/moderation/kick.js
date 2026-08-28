const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(option => option.setName('user').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('سبب الطرد').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';

            if (user.id === interaction.user.id) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك طرد نفسك.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.guild.ownerId) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك طرد مالك السيرفر.')], flags: [MessageFlags.Ephemeral] });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (!member) {
                return interaction.reply({ embeds: [errorEmbed('العضو غير موجود في السيرفر.')], flags: [MessageFlags.Ephemeral] });
            }

            if (!member.kickable || (interaction.user.id !== interaction.guild.ownerId && interaction.member.roles.highest.position <= member.roles.highest.position)) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنني طرد هذا العضو بسبب الرتبة أو الصلاحيات.')], flags: [MessageFlags.Ephemeral] });
            }

            await member.kick(reason);
            logger.info(`KICK: ${user.tag} was kicked by ${interaction.user.tag}. Reason: ${reason}`);

            await interaction.reply({ embeds: [successEmbed(`تم طرد العضو **${user.tag}** بنجاح.\nالسبب: ${reason}`)] });
        } catch (error) {
            logger.error(`Kick Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء محاولة طرد العضو.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
