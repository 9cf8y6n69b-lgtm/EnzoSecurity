const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, securityEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('إدارة نظام منع التكرار والإغراق (Anti-Spam)')
        .addSubcommand(sub => sub.setName('enable').setDescription('تفعيل نظام منع التكرار'))
        .addSubcommand(sub => sub.setName('disable').setDescription('تعطيل نظام منع التكرار'))
        .addSubcommand(sub => sub.setName('status').setDescription('عرض حالة نظام منع التكرار'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        try {
            if (sub === 'enable' || sub === 'disable') {
                const isEnable = sub === 'enable';
                await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { antiSpam: { enabled: isEnable } });
                return interaction.reply({ embeds: [securityEmbed(`نظام منع التكرار أصبح الآن **${isEnable ? 'مفعلاً ✅' : 'معطلاً ❌'}**.`)] });
            }
            if (sub === 'status') {
                let enabled = false;
                const guildData = await Guild.findOne({ guildId: interaction.guild.id });
                if (guildData && guildData.antiSpam) enabled = guildData.antiSpam.enabled;
                return interaction.reply({ embeds: [infoEmbed(`**حالة نظام منع التكرار (Anti-Spam Status)**\nالمفعل: \`${enabled ? 'مفعل ✅' : 'معطل ❌'}\``)] });
            }
        } catch (error) {
            logger.error(`Antispam Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء تنفيذ الأمر.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
