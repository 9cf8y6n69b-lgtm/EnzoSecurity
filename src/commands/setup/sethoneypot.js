const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../database/models/Guild');
const honeypot = require('../../systems/honeypot');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sethoneypot')
        .setDescription('إعداد قناة المصيدة (Honeypot) لحظر المخربين والبوتات تلقائياً')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('تحديد قناة كمصيدة وإرسال إشعار التحذير إليها')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('القناة النصية المراد تحويلها إلى مصيدة')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('إلغاء وتجميع نظام قناة المصيدة')
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            const config = require('../../../config.json');
            const em = config.emojis || {};

            if (subcommand === 'channel') {
                const targetChannel = interaction.options.getChannel('channel');

                await Guild.findOneAndUpdate(
                    { guildId: guildId },
                    { $set: { honeypotChannelId: targetChannel.id } }
                );

                await honeypot.sendHoneypotEmbed(targetChannel);

                return interaction.editReply({
                    content: `${em.success || '✅'} تم تعيين القناة <#${targetChannel.id}> كـ **قناة مصيدة (Honeypot Trap Channel)** بنجاح وإرسال إشعار التحذير الحاسم إليها!`
                });
            }

            if (subcommand === 'disable') {
                await Guild.findOneAndUpdate(
                    { guildId: guildId },
                    { $set: { honeypotChannelId: null } }
                );

                return interaction.editReply({
                    content: `${em.success || '✅'} تم إلغاء وتعطيل قناة المصيدة (Honeypot Channel) بنجاح.`
                });
            }
        } catch (error) {
            console.error('[SETHONEYPOT COMMAND ERROR]', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
            } else {
                await interaction.editReply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.' });
            }
        }
    },
};
