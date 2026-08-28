const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح مجموعة من الرسائل من القناة')
        .addIntegerOption(option => option.setName('amount').setDescription('عدد الرسائل المراد مسحها (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(option => option.setName('user').setDescription('تصفية مسح الرسائل لعضو معين (اختياري)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            const amount = interaction.options.getInteger('amount');
            const user = interaction.options.getUser('user');

            let messages = await interaction.channel.messages.fetch({ limit: amount });

            if (user) {
                messages = messages.filter(m => m.author.id === user.id);
            }

            const deleted = await interaction.channel.bulkDelete(messages, true);

            await interaction.reply({ embeds: [successEmbed(`تم مسح **${deleted.size}** رسالة بنجاح.`)], flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            logger.error(`Clear Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء مسح الرسائل. ملاحظة: الرسائل الأقدم من 14 يوماً لا يمكن مسحها دفعة واحدة.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
