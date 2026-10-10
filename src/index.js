require('dotenv').config();
const ExtendedClient = require('./structures/ExtendedClient');
const connectDB = require('./database/connect');
const initDashboard = require('./dashboard/api');

const client = new ExtendedClient();

(async () => {

    try {
        connectDB();
    } catch (err) {
        console.error('[DB ERROR] Could not connect to database:', err);
    }

    await client.start(process.env.TOKEN);

    initDashboard(client);
})();

process.on('unhandledRejection', (error) => {
    console.error('[UNHANDLED REJECTION]', error);
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]', error);
});
