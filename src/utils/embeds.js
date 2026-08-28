const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const emojis = config.emojis || {};

module.exports = {

    successEmbed: (titleOrDescription, description) => {
        const icon = emojis.success || '';
        const embed = new EmbedBuilder().setColor('#57F287').setTimestamp();
        if (description) {
            embed.setTitle(`${icon} ${titleOrDescription}`.trim()).setDescription(description);
        } else {
            embed.setDescription(`${icon} ${titleOrDescription}`.trim());
        }
        return embed;
    },

    errorEmbed: (titleOrDescription, description) => {
        const icon = emojis.error || '';
        const embed = new EmbedBuilder().setColor('#ED4245').setTimestamp();
        if (description) {
            embed.setTitle(`${icon} ${titleOrDescription}`.trim()).setDescription(description);
        } else {
            embed.setDescription(`${icon} ${titleOrDescription}`.trim());
        }
        return embed;
    },

    warnEmbed: (titleOrDescription, description) => {
        const icon = emojis.warning || '';
        const embed = new EmbedBuilder().setColor('#FEE75C').setTimestamp();
        if (description) {
            embed.setTitle(`${icon} ${titleOrDescription}`.trim()).setDescription(description);
        } else {
            embed.setDescription(`${icon} ${titleOrDescription}`.trim());
        }
        return embed;
    },

    infoEmbed: (titleOrDescription, description) => {
        const icon = emojis.info || '';
        const embed = new EmbedBuilder().setColor('#5865F2').setTimestamp();
        if (description) {
            embed.setTitle(`${icon} ${titleOrDescription}`.trim()).setDescription(description);
        } else {
            embed.setDescription(`${icon} ${titleOrDescription}`.trim());
        }
        return embed;
    },

    securityEmbed: (titleOrDescription, description) => {
        const icon = emojis.shield || '';
        const embed = new EmbedBuilder().setColor('#ED4245').setTimestamp();
        if (description) {
            embed.setTitle(`${icon} ${titleOrDescription}`.trim()).setDescription(description);
        } else {
            embed.setDescription(`${icon} ${titleOrDescription}`.trim());
        }
        return embed;
    }
};
