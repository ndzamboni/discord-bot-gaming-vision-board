require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,
  dbConfig: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, // This is where DB_NAME is used
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  },
};
