const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, securityEmbed, infoEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const Guild = require('../../database/models/Guild.js');
const Whitelist = require('../../database/models/Whitelist.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('إدارة نظام منع التدمير (Anti-Nuke)')
        .addSubcommand(sub => sub.setName('enable').setDescription('تفعيل نظام منع التدمير'))
        .addSubcommand(sub => sub.setName('disable').setDescription('تعطيل نظام منع التدمير'))
        .addSubcommand(sub => sub.setName('status').setDescription('عرض حالة نظام منع التدمير'))
        .addSubcommandGroup(group => group
            .setName('whitelist')
            .setDescription('إدارة القائمة البيضاء لنظام التدمير')
            .addSubcommand(sub => sub.setName('add').setDescription('إضافة مستخدم للقائمة البيضاء').addUserOption(o => o.setName('user').setDescription('المستخدم').setRequired(true)))
            .addSubcommand(sub => sub.setName('remove').setDescription('إزالة مستخدم من القائمة البيضاء').addUserOption(o => o.setName('user').setDescription('المستخدم').setRequired(true)))
            .addSubcommand(sub => sub.setName('list').setDescription('عرض الأعضاء الموثوقين'))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();

        try {
            if (group === 'whitelist') {
                if (sub === 'add') {
                    const user = interaction.options.getUser('user');
                    await Whitelist.create({ guildId: interaction.guild.id, userId: user.id, addedBy: interaction.user.id });
                    return interaction.reply({ embeds: [successEmbed(`تمت إضافة **${user.tag}** إلى القائمة البيضاء بنجاح.`)] });
                }
                if (sub === 'remove') {
                    const user = interaction.options.getUser('user');
                    await Whitelist.findOneAndDelete({ guildId: interaction.guild.id, userId: user.id });
                    return interaction.reply({ embeds: [successEmbed(`تمت إزالة **${user.tag}** من القائمة البيضاء.`)] });
                }
                if (sub === 'list') {
                    const docs = await Whitelist.find({ guildId: interaction.guild.id });
                    const list = docs.map(d => `<@${d.userId}>`);
                    const desc = list.length > 0 ? list.join('\n') : 'لا يوجد أعضاء في القائمة البيضاء حالياً.';
                    return interaction.reply({ embeds: [infoEmbed(`**القائمة البيضاء لنظام Anti-Nuke**\n${desc}`)] });
                }
            } else {
                if (sub === 'enable' || sub === 'disable') {
                    const isEnable = sub === 'enable';
                    await Guild.findOneAndUpdate({ guildId: interaction.guild.id }, { antiNuke: { enabled: isEnable } });
                    logger.info(`ANTINUKE ${isEnable ? 'ENABLED' : 'DISABLED'} by ${interaction.user.tag}`);
                    return interaction.reply({ embeds: [securityEmbed(`نظام منع التدمير أصبح الآن **${isEnable ? 'مفعلاً ✅' : 'معطلاً ❌'}**.`)] });
                }
                if (sub === 'status') {
                    let enabled = false;
                    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
                    if (guildData && guildData.antiNuke) enabled = guildData.antiNuke.enabled;

                    return interaction.reply({ embeds: [infoEmbed(`**حالة نظام منع التدمير (Anti-Nuke Status)**\nالمفعل: \`${enabled ? 'مفعل ✅' : 'معطل ❌'}\``)] });
                }
            }
        } catch (error) {
            logger.error(`Antinuke Error: ${error.message}`);
            const errorPayload = { embeds: [errorEmbed('حدث خطأ أثناء تنفيذ الأمر.')], flags: [MessageFlags.Ephemeral] };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorPayload).catch(() => null);
            } else {
                await interaction.reply(errorPayload).catch(() => null);
            }
        }
    }
};
