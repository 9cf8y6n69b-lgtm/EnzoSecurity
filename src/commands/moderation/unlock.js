const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds.js');
const logger = require('../../systems/logger.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح قناة مقفلة والسماح للأعضاء بالكتابة')
        .addChannelOption(o =>
            o.setName('channel')
                .setDescription('القناة المراد فتحها (افتراضياً القناة الحالية)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const em = config.emojis || {};

            await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null,
                SendMessagesInThreads: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null,
                Connect: null
            }, { reason: `Unlocked by ${interaction.user.tag}` });

            const unlockAnnouncement = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`${em.unlock || '🔓'} تم فتح القناة`.trim())
                .setDescription(`تم فتح هذه القناة بواسطة المشرف <@${interaction.user.id}>. يمكنكم الآن المشاركة والتحدث.`)
                .setTimestamp();

            await targetChannel.send({ embeds: [unlockAnnouncement] }).catch(() => null);

            logger.info(`UNLOCK: ${targetChannel.name} unlocked by ${interaction.user.tag}`);

            if (targetChannel.id !== interaction.channel.id) {
                await interaction.reply({
                    embeds: [successEmbed(`تم فتح القناة ${targetChannel} بنجاح.`)]
                });
            } else {
                await interaction.reply({
                    embeds: [successEmbed(`تم فتح هذه القناة بنجاح.`)],
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } catch (error) {
            logger.error(`Unlock Error: ${error.message}`);
            await interaction.reply({
                embeds: [errorEmbed('حدث خطأ أثناء محاولة فتح القناة.')],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
