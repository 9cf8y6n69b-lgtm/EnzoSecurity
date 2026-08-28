const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('فك حظر عضو من السيرفر')
        .addStringOption(o =>
            o.setName('user_id')
                .setDescription('معرّف (ID) العضو المراد فك حظره')
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName('reason')
                .setDescription('سبب فك الحظر')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        try {
            const userId = interaction.options.getString('user_id').trim();
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';

            if (!/^\d{17,20}$/.test(userId)) {
                return interaction.reply({
                    embeds: [errorEmbed('يرجى كتابة معرّف (ID) مستخدم صحيح يتكون من 17 إلى 20 رقماً.')],
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const ban = await interaction.guild.bans.fetch(userId).catch(() => null);

            if (!ban) {
                return interaction.reply({
                    embeds: [errorEmbed('هذا المستخدم غير محظور في هذا السيرفر أو تم فك حظره مسبقاً.')],
                    flags: [MessageFlags.Ephemeral]
                });
            }

            await interaction.guild.members.unban(userId, reason);
            logger.info(`UNBAN: ${ban.user.tag} (${userId}) unbanned by ${interaction.user.tag}. Reason: ${reason}`);

            await logger.log(interaction.guild, 'MEMBER_UNBAN', {
                target: ban.user,
                executor: interaction.user,
                reason: reason
            });

            await interaction.reply({
                embeds: [successEmbed(`تم فك حظر العضو **${ban.user.tag}** (\`${userId}\`) بنجاح.\nالسبب: ${reason}`)]
            });
        } catch (error) {
            logger.error(`Unban Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة فك حظر العضو.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
