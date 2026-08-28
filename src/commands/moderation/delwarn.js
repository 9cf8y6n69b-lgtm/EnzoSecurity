const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Warning = require('../../database/models/Warning.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delwarn')
        .setDescription('حذف تحذير محدد أو مسح تحذيرات عضو')
        .addSubcommand(sub =>
            sub.setName('id')
                .setDescription('حذف تحذير محدد بواسطة رقمه (Warning ID)')
                .addIntegerOption(o =>
                    o.setName('warn_id')
                        .setDescription('رقم التحذير المراد حذفه')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('مسح جميع تحذيرات عضو محدد')
                .addUserOption(o =>
                    o.setName('user')
                        .setDescription('العضو المراد مسح كافة تحذيراته')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'id') {
                const warnId = interaction.options.getInteger('warn_id');
                const warning = await Warning.findById(warnId, interaction.guild.id);

                if (!warning) {
                    return interaction.reply({
                        embeds: [errorEmbed(`لم يتم العثور على تحذير بالرقم **#${warnId}** في هذا السيرفر.`)],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                await Warning.deleteById(warnId, interaction.guild.id);

                const targetUser = await interaction.client.users.fetch(warning.userId).catch(() => ({ id: warning.userId, tag: warning.userId }));

                logger.info(`WARN_DELETE: Warning #${warnId} (User: ${targetUser.tag || targetUser.id}) deleted by ${interaction.user.tag}`);

                await logger.log(interaction.guild, 'WARN_DELETE', {
                    target: targetUser,
                    executor: interaction.user,
                    reason: `حذف التحذير رقم #${warnId} (السبب السابق: ${warning.reason})`
                });

                return interaction.reply({
                    embeds: [successEmbed(`تم حذف التحذير رقم **#${warnId}** الخاص بالعضو **${targetUser.tag || targetUser.id}** بنجاح.`)]
                });
            }

            if (subcommand === 'clear') {
                const user = interaction.options.getUser('user');

                if (user.bot) {
                    return interaction.reply({
                        embeds: [errorEmbed('البوتات لا تملك أي تحذيرات مسجلة.')],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const userWarnings = await Warning.find({ guildId: interaction.guild.id, userId: user.id });

                if (!userWarnings || userWarnings.length === 0) {
                    return interaction.reply({
                        embeds: [infoEmbed(`العضو **${user.tag}** ليس لديه أي تحذيرات مسجلة.`)],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const count = userWarnings.length;
                await Warning.deleteMany({ guildId: interaction.guild.id, userId: user.id });

                logger.info(`WARN_CLEAR: All warnings (${count}) for ${user.tag} cleared by ${interaction.user.tag}`);

                await logger.log(interaction.guild, 'WARN_DELETE', {
                    target: user,
                    executor: interaction.user,
                    reason: `مسح كافة التحذيرات (${count} تحذير)`
                });

                return interaction.reply({
                    embeds: [successEmbed(`تم مسح جميع تحذيرات العضو **${user.tag}** (**${count}** تحذير) بنجاح.`)]
                });
            }
        } catch (error) {
            logger.error(`Delwarn Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة حذف التحذير.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
