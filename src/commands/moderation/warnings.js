const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Warning = require('../../database/models/Warning.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض سجل وقائمة التحذيرات لعضو أو للسيرفر')
        .addUserOption(o =>
            o.setName('user')
                .setDescription('العضو المراد استعراض تحذيراته (اتركه فارغاً لعرض آخر تحذيرات السيرفر)')
                .setRequired(false)
        )
        .addIntegerOption(o =>
            o.setName('page')
                .setDescription('رقم الصفحة')
                .setRequired(false)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const page = interaction.options.getInteger('page') || 1;
            const pageSize = 5;
            const em = config.emojis || {};

            if (user) {
                if (user.bot) {
                    return interaction.reply({
                        embeds: [infoEmbed('البوتات لا تملك أي تحذيرات مسجلة.')],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const userWarnings = await Warning.find({ guildId: interaction.guild.id, userId: user.id });

                if (!userWarnings || userWarnings.length === 0) {
                    return interaction.reply({
                        embeds: [infoEmbed(`لا توجد أي تحذيرات مسجلة للعضو **${user.tag}**.`)],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const totalPages = Math.ceil(userWarnings.length / pageSize) || 1;
                const currentPage = Math.min(Math.max(page, 1), totalPages);
                const startIndex = (currentPage - 1) * pageSize;
                const displayedWarnings = userWarnings.slice(startIndex, startIndex + pageSize);

                const embed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle(`${em.warning || '⚠️'} سجل تحذيرات العضو: ${user.tag}`.trim())
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription(`إجمالي عدد التحذيرات: **${userWarnings.length}** تحذير(ات) | الصفحة **${currentPage}** من **${totalPages}**`)
                    .setTimestamp()
                    .setFooter({ text: `EnzoSecurity • ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

                displayedWarnings.forEach((w, idx) => {
                    const warnNumber = startIndex + idx + 1;
                    const dateUnix = Math.floor(new Date(w.createdAt).getTime() / 1000);
                    embed.addFields({
                        name: `#${w.id} • التحذير ${warnNumber}`,
                        value: `👤 **المشرف:** <@${w.moderatorId}>
📝 **السبب:** ${w.reason}
⏱️ **التاريخ:** <t:${dateUnix}:F> (<t:${dateUnix}:R>)`,
                        inline: false
                    });
                });

                return interaction.reply({ embeds: [embed] });
            }

            const allWarnings = await Warning.find({ guildId: interaction.guild.id });

            if (!allWarnings || allWarnings.length === 0) {
                return interaction.reply({
                    embeds: [infoEmbed('لا توجد أي تحذيرات مسجلة في هذا السيرفر حالياً.')],
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const totalPages = Math.ceil(allWarnings.length / pageSize) || 1;
            const currentPage = Math.min(Math.max(page, 1), totalPages);
            const startIndex = (currentPage - 1) * pageSize;
            const displayedWarnings = allWarnings.slice(startIndex, startIndex + pageSize);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${em.log || '📋'} سجل تحذيرات السيرفر: ${interaction.guild.name}`.trim())
                .setDescription(`إجمالي التحذيرات المسجلة: **${allWarnings.length}** | الصفحة **${currentPage}** من **${totalPages}**`)
                .setTimestamp()
                .setFooter({ text: `EnzoSecurity • ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

            displayedWarnings.forEach((w) => {
                const dateUnix = Math.floor(new Date(w.createdAt).getTime() / 1000);
                embed.addFields({
                    name: `التحذير #${w.id} • العضو: <@${w.userId}>`,
                    value: `🛡️ **المشرف:** <@${w.moderatorId}>
📝 **السبب:** ${w.reason}
⏱️ **التاريخ:** <t:${dateUnix}:F> (<t:${dateUnix}:R>)`,
                    inline: false
                });
            });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error(`Warnings Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة عرض سجل التحذيرات.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
