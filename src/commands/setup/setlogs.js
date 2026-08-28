const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('تحديد قناة سجلات الأمان والأنشطة')
        .addChannelOption(option => option.setName('channel').setDescription('قناة السجلات').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { logChannelId: channel.id });
            logger.info(`LOGS CHANNEL SET: ${channel.name} by ${interaction.user.tag}`);
            await interaction.reply({ embeds: [successEmbed(`تم تحديد قناة السجلات بنجاح إلى القناة ${channel}.`)] });
        } catch (error) {
            logger.error(`Setlogs Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء تحديد قناة السجلات.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
