// مثال داخل ملف الأمر (مثل src/commands/utility/ping.js)
module.exports = {
    name: 'jail',
    description: 'سجن عضو وتحديد رتبة السجن له',
    aliases: ['سجن', 'حبس'], // 👈 هنا تضع جميع الاختصارات التي تريدها

    async execute(message, args) {
        // كود الأمر هنا
    }
};
