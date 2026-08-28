const { PermissionsBitField } = require('discord.js');

module.exports = {

    isAdmin: (member) => {
        if (!member) return false;
        return member.permissions.has(PermissionsBitField.Flags.Administrator);
    },

    isMod: (member) => {
        if (!member) return false;
        return member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
               member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
               member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
               module.exports.isAdmin(member);
    },

    isOwner: (member) => {
        if (!member || !member.guild) return false;
        return member.id === member.guild.ownerId;
    },

    checkHierarchy: (executor, target) => {
        if (!executor || !target) return false;

        if (module.exports.isOwner(executor)) return true;

        if (module.exports.isOwner(target)) return false;

        return executor.roles.highest.position > target.roles.highest.position;
    }
};
