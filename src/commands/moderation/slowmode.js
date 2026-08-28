const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('تحديد أو إلغاء وضع التهدئة (Slowmode) لقناة معينة')
        .addIntegerOption(o =>
            o.setName('seconds')
                .setDescription('مدة التهدئة بالثواني (0 لإلغاء التهدئة، الحد الأقصى 21600)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .addChannelOption(o =>
            o.setName('channel')
                .setDescription('القناة المستهدفة (افتراضياً القناة الحالية)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const seconds = interaction.options.getInteger('seconds');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

            if (!targetChannel || typeof targetChannel.setRateLimitPerUser !== 'function') {
                return interaction.reply({
                    embeds: [errorEmbed('لا يمكن تطبيق وضع التهدئة على هذه القناة.')],
                    flags: [MessageFlags.Ephemeral]
                });
            }

            await targetChannel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

            if (seconds === 0) {
                await interaction.reply({
                    embeds: [successEmbed(`تم إلغاء وضع التهدئة بنجاح في القناة ${targetChannel}.`)]
                });
            } else {
                await interaction.reply({
                    embeds: [successEmbed(`تم ضبط وضع التهدئة في القناة ${targetChannel} إلى **${seconds}** ثانية.`)]
                });
            }

            logger.info(`SLOWMODE: ${targetChannel.name} set to ${seconds}s by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Slowmode Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة تعديل وضع التهدئة.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
