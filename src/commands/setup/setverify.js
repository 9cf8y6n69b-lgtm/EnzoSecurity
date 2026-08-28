const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setverify')
        .setDescription('إعداد وتأكيد نظام التحقق والتفعيل التلقائي')
        .addChannelOption(option => option.setName('channel').setDescription('قناة التحقق').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(option => option.setName('role').setDescription('رول المفعلين').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');

            await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { verifyChannelId: channel.id, verifiedRoleId: role.id });

            const verifyEmbed = infoEmbed('**التحقق التلقائي مطلوب 🛡️**\nيرجى الضغط على الزر أدناه لتأكيد حسابك ودخول السيرفر والحصول على الرول.');
            const config = require('../../../config.json');
            const button = new ButtonBuilder().setCustomId('verify_button').setLabel('تأكيد الحساب (Verify)').setStyle(ButtonStyle.Success);
            if (config.emojis?.success) {
                button.setEmoji(config.emojis.success);
            }
            const row = new ActionRowBuilder().addComponents(button);

            await channel.send({ embeds: [verifyEmbed], components: [row] });

            logger.info(`VERIFY SETUP: Channel ${channel.name}, Role ${role.name} by ${interaction.user.tag}`);
            await interaction.reply({ embeds: [successEmbed(`تم إعداد نظام التحقق بنجاح في القناة ${channel} وتخصيص الرول ${role}.`)] });
        } catch (error) {
            logger.error(`Setverify Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء إعداد نظام التحقق.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
