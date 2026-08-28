const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../database/models/Guild.js');
const Whitelist = require('../../database/models/Whitelist.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('إدارة القائمة البيضاء المستثناة من جميع أنظمة الأمان')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add_user')
                .setDescription('إضافة عضو للقائمة البيضاء المستثناة')
                .addUserOption(o => o.setName('user').setDescription('العضو المراد استثناؤه').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add_role')
                .setDescription('إضافة رتبة كاملة للقائمة البيضاء المستثناة')
                .addRoleOption(o => o.setName('role').setDescription('الرتبة المراد استثناؤها').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove_user')
                .setDescription('إزالة عضو من القائمة البيضاء')
                .addUserOption(o => o.setName('user').setDescription('العضو المراد إزالته').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove_role')
                .setDescription('إزالة رتبة من القائمة البيضاء')
                .addRoleOption(o => o.setName('role').setDescription('الرتبة المراد إزالتها').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('عرض جميع الأعضاء والرتب المستثناة في القائمة البيضاء')
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const sub = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            const settings = await Guild.getOrCreate(guildId);
            let whitelist = Array.isArray(settings.whitelist) ? [...settings.whitelist] : [];

            const config = require('../../../config.json');
            const em = config.emojis || {};

            if (sub === 'add_user') {
                const user = interaction.options.getUser('user');
                if (whitelist.includes(user.id)) {
                    return interaction.editReply({ content: `${em.info || ''} العضو <@${user.id}> موجود مسبقاً في القائمة البيضاء` });
                }
                whitelist.push(user.id);
                await Guild.findOneAndUpdate({ guildId }, { whitelist });
                await Whitelist.create({ guildId, userId: user.id, addedBy: interaction.user.tag }).catch(() => null);
                return interaction.editReply({ content: `${em.success || ''} تمت إضافة العضو <@${user.id}> للقائمة البيضاء المستثناة بنجاح` });
            }

            if (sub === 'add_role') {
                const role = interaction.options.getRole('role');
                if (whitelist.includes(role.id)) {
                    return interaction.editReply({ content: `${em.info || ''} الرتبة <@&${role.id}> موجودة مسبقاً في القائمة البيضاء` });
                }
                whitelist.push(role.id);
                await Guild.findOneAndUpdate({ guildId }, { whitelist });
                await Whitelist.create({ guildId, userId: role.id, addedBy: interaction.user.tag }).catch(() => null);
                return interaction.editReply({ content: `${em.success || ''} تمت إضافة الرتبة <@&${role.id}> للقائمة البيضاء المستثناة بنجاح` });
            }

            if (sub === 'remove_user') {
                const user = interaction.options.getUser('user');
                if (!whitelist.includes(user.id)) {
                    return interaction.editReply({ content: `${em.info || ''} العضو <@${user.id}> غير موجود في القائمة البيضاء` });
                }
                whitelist = whitelist.filter(id => id !== user.id);
                await Guild.findOneAndUpdate({ guildId }, { whitelist });
                await Whitelist.findOneAndDelete({ guildId, userId: user.id }).catch(() => null);
                return interaction.editReply({ content: `${em.success || ''} تمت إزالة العضو <@${user.id}> من القائمة البيضاء بنجاح` });
            }

            if (sub === 'remove_role') {
                const role = interaction.options.getRole('role');
                if (!whitelist.includes(role.id)) {
                    return interaction.editReply({ content: `${em.info || ''} الرتبة <@&${role.id}> غير موجودة في القائمة البيضاء` });
                }
                whitelist = whitelist.filter(id => id !== role.id);
                await Guild.findOneAndUpdate({ guildId }, { whitelist });
                await Whitelist.findOneAndDelete({ guildId, userId: role.id }).catch(() => null);
                return interaction.editReply({ content: `${em.success || ''} تمت إزالة الرتبة <@&${role.id}> من القائمة البيضاء بنجاح` });
            }

            if (sub === 'list') {
                if (whitelist.length === 0) {
                    return interaction.editReply({ content: `${em.info || ''} لا توجد أعضاء أو رتب مستثناة في القائمة البيضاء حالياً` });
                }
                const formattedList = whitelist.map(id => {
                    const isRole = interaction.guild.roles.cache.has(id);
                    return isRole ? `رتبة <@&${id}>` : `عضو <@${id}>`;
                }).join('\n');

                return interaction.editReply({ content: `${em.shield || ''} **القائمة البيضاء المستثناة**\n${formattedList}` });
            }
        } catch (error) {
            console.error('[WHITELIST COMMAND ERROR]', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'حدث خطأ أثناء تنفيذ الأمر' });
            }
        }
    }
};
