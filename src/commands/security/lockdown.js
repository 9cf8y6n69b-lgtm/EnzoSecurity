const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, securityEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('تفعيل أو إلغاء وضع الإغلاق للسيرفر (Lockdown)')
        .addStringOption(option =>
            option.setName('state')
            .setDescription('حالة وضع الإغلاق')
            .setRequired(true)
            .addChoices(
                { name: 'تفعيل (enable)', value: 'enable' },
                { name: 'إلغاء (disable)', value: 'disable' }
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const state = interaction.options.getString('state');
            const isEnable = state === 'enable';

            await interaction.deferReply();

            const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
            let updated = 0;

            for (const [id, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: !isEnable
                    });
                    updated++;
                } catch (e) {}
            }

            try {
                await Guild.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { lockdown: isEnable }
                );
            } catch (e) {
                logger.error(`DB Error: ${e.message}`);
            }

            logger.info(`LOCKDOWN ${isEnable ? 'ENABLED' : 'DISABLED'} by ${interaction.user.tag}`);

            await interaction.editReply({ embeds: [securityEmbed(`وضع إغلاق السيرفر أصبح الآن **${isEnable ? 'مفعلاً 🔒' : 'ملغياً 🔓'}**.\nتم تحديث صلاحيات ${updated} قناة.`)] });
        } catch (error) {
            logger.error(`Lockdown Error: ${error.message}`);
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed('حدث خطأ أثناء تنفيذ وضع الإغلاق.')] });
            } else {
                await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء تنفيذ وضع الإغلاق.')], flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
