const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '727340837423546400';    // Replace with your Discord server's ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const commands = [
  {
    name: 'bonezoneboard',
    description: 'Post a game from Steam',
    options: [
      {
        name: 'appid',
        type: 3, // STRING
        description: 'Steam Application ID of the game',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '9' }).setToken(botToken);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'bonezoneboard') {
    const appId = options.getString('appid');

    try {
      const response = await axios.get(`http://store.steampowered.com/api/appdetails?appids=${appId}&key=${steamApiKey}`);
      const gameData = response.data[appId].data;
      const title = gameData.name;
      const coverArtUrl = gameData.header_image;
      const description = gameData.short_description;

      const gameDetails = { title, coverArtUrl, description };
      const userId = await saveUser(interaction.user.id, interaction.user.username);
      
      const gameId = await saveGameToDatabase(gameDetails, userId);
      const embed = createGameEmbed(gameDetails, gameId);
      await interaction.reply({ embeds: [embed] });

      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');

    } catch (error) {
      console.error('Failed to fetch game from Steam:', error);
      await interaction.reply('Failed to fetch game details from Steam. Please check the AppID and try again.');
    }
  }
});

function createGameEmbed(gameDetails, gameId) {
  return {
    title: gameDetails.title,
    description: gameDetails.description,
    image: { url: gameDetails.coverArtUrl },
    footer: { text: `Game ID: ${gameId}` },
  };
}

client.login(botToken);
