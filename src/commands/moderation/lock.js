const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل قناة معينة ومنع الأعضاء من الكتابة فيها')
        .addChannelOption(o =>
            o.setName('channel')
                .setDescription('القناة المراد قفلها (افتراضياً القناة الحالية)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
        )
        .addStringOption(o =>
            o.setName('reason')
                .setDescription('سبب القفل')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'لم يتم تقديم سبب';
            const em = config.emojis || {};

            await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                Connect: false
            }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

            const lockAnnouncement = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(`${em.lock || '🔒'} تم قفل القناة`.trim())
                .setDescription(`تم قفل هذه القناة بواسطة المشرف <@${interaction.user.id}>.\n**السبب:** ${reason}`)
                .setTimestamp();

            await targetChannel.send({ embeds: [lockAnnouncement] }).catch(() => null);

            logger.info(`LOCK: ${targetChannel.name} locked by ${interaction.user.tag}`);

            if (targetChannel.id !== interaction.channel.id) {
                await interaction.reply({
                    embeds: [successEmbed(`تم قفل القناة ${targetChannel} بنجاح.`)]
                });
            } else {
                await interaction.reply({
                    embeds: [successEmbed(`تم قفل هذه القناة بنجاح.`)],
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            logger.error(`Lock Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة قفل القناة.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
