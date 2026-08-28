const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, securityEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('إدارة نظام منع الغارات (Anti-Raid)')
        .addSubcommand(sub => sub.setName('enable').setDescription('تفعيل نظام منع الغارات'))
        .addSubcommand(sub => sub.setName('disable').setDescription('تعطيل نظام منع الغارات'))
        .addSubcommand(sub => sub.setName('status').setDescription('عرض حالة نظام منع الغارات'))
        .addSubcommand(sub => sub.setName('config')
            .setDescription('ضبط إعدادات نظام الغارات')
            .addIntegerOption(o => o.setName('threshold').setDescription('حد الدخول المسموح').setRequired(true))
            .addIntegerOption(o => o.setName('interval').setDescription('النافذة الزمنية بالثواني').setRequired(true))
            .addStringOption(o => o.setName('action').setDescription('الإجراء المتخذ عند الهجوم').setRequired(true).addChoices({name:'طرد (kick)',value:'kick'},{name:'حظر (ban)',value:'ban'}))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        try {
            const settings = await Guild.getOrCreate(interaction.guild.id);

            if (sub === 'enable' || sub === 'disable') {
                const isEnable = sub === 'enable';
                settings.antiRaid.enabled = isEnable;
                await settings.save();
                return interaction.reply({ embeds: [securityEmbed(`نظام منع الغارات أصبح الآن **${isEnable ? 'مفعلاً ✅' : 'معطلاً ❌'}**.`)] });
            }
            if (sub === 'status') {
                const ar = settings.antiRaid;
                return interaction.reply({ embeds: [infoEmbed(`**حالة نظام منع الغارات (Anti-Raid Status)**\nالمفعل: \`${ar.enabled ? 'مفعل ✅' : 'معطل ❌'}\`\nحد الدخول: \`${ar.joinThreshold}\` أعضاء خلال \`${ar.joinInterval / 1000} ثانية\`\nالإجراء: \`${ar.action}\``)] });
            }
            if (sub === 'config') {
                const threshold = interaction.options.getInteger('threshold');
                const interval = interaction.options.getInteger('interval');
                const action = interaction.options.getString('action');
                settings.antiRaid.joinThreshold = threshold;
                settings.antiRaid.joinInterval = interval * 1000;
                settings.antiRaid.action = action;
                await settings.save();
                return interaction.reply({ embeds: [successEmbed(`تم ضبط إعدادات الغارات: **${threshold}** دخول / **${interval} ثانية** → **${action}**`)] });
            }
        } catch (error) {
            logger.error(`Antiraid Error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('حدث خطأ أثناء تنفيذ الأمر.')], flags: [MessageFlags.Ephemeral] });
        }
    }
};
