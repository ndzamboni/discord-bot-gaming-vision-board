module.exports = {
  botToken: process.env.BOT_TOKEN,
  steamApiKey: process.env.STEAM_API_KEY,
  dbConfig: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  },
};
