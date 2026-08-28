const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warnEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Warning = require('../../database/models/Warning.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('إرسال تحذير تنبيهي لعضو')
        .addUserOption(option => option.setName('user').setDescription('العضو المراد تحذيره').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('سبب التحذير').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';

            if (user.bot) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك تحذير البوتات.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.user.id) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك تحذير نفسك.')], flags: [MessageFlags.Ephemeral] });
            }

            if (user.id === interaction.guild.ownerId) {
                return interaction.reply({ embeds: [errorEmbed('لا يمكنك تحذير مالك السيرفر.')], flags: [MessageFlags.Ephemeral] });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (member) {
                if (interaction.user.id !== interaction.guild.ownerId && interaction.member.roles.highest.position <= member.roles.highest.position) {
                    return interaction.reply({ embeds: [errorEmbed('لا يمكنك تحذير عضو برتبة أعلى منك أو مساوية لرتبتك.')], flags: [MessageFlags.Ephemeral] });
                }
            }

            let warningCount = 1;
            try {
                await Warning.create({
                    guildId: interaction.guild.id,
                    userId: user.id,
                    moderatorId: interaction.user.id,
                    reason: reason
                });
                const userWarnings = await Warning.find({ guildId: interaction.guild.id, userId: user.id });
                warningCount = userWarnings.length;
            } catch (err) {
                logger.error(`DB Error in warn: ${err.message}`);
            }

            logger.info(`WARN: ${user.tag} warned by ${interaction.user.tag}. Reason: ${reason}`);

            try {
                await user.send({ embeds: [warnEmbed(`لقد تلقيت تحذيراً في سيرفر **${interaction.guild.name}**.\nالسبب: ${reason}`)] });
            } catch (err) {

            }

            await interaction.reply({ embeds: [successEmbed(`تم تحذير العضو **${user.tag}** بنجاح. لديه الآن **${warningCount}** تحذير(ات).\nالسبب: ${reason}`)] });
        } catch (error) {
            logger.error(`Warn Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء محاولة تحذير العضو.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
