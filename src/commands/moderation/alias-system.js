const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// خريطة لتخزين الاختصارات المخصصة في الذاكرة
const customAliases = new Map();

module.exports = {
    // 1️⃣ أمر إضافة اختصار جديد من الديسكورد
    data: new SlashCommandBuilder()
        .setName('add-alias')
        .setDescription('إضافة اختصار جديد لأي أمر من داخل الديسكورد')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('command')
                .setDescription('اسم الأمر الأصلي (مثال: jail)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('alias')
                .setDescription('اسم الاختصار الجديد الذي تريده (مثال: حبس)')
                .setRequired(true)),

    async execute(interaction) {
        const originalCommand = interaction.options.getString('command').toLowerCase();
        const aliasName = interaction.options.getString('alias').toLowerCase();

        // إضافة الاختصار للخريطة
        customAliases.set(aliasName, originalCommand);

        const embed = new EmbedBuilder()
            .setTitle('✅ تم إضافة الاختصار بنجاح!')
            .setColor('#00FF00')
            .addFields(
                { name: 'الأمر الأصلي:', value: `\`/${originalCommand}\``, inline: true },
                { name: 'الاختصار الجديد:', value: `\`/${aliasName}\``, inline: true }
            )
            .setFooter({ text: 'يمكنك الآن استخدام الاختصار مباشرة في السيرفر!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    // مصدر الاختصارات للربط مع معالج الأوامر
    getAliasesMap() {
        return customAliases;
    }
};
