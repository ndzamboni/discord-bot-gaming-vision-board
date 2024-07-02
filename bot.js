const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { botToken } = require('./config');
const { saveUser, saveGameToDatabase, updateVoteCount } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '824671154634489876';    // Replace with your Discord server's ID

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
    name: 'postgame',
    description: 'Post a new game',
    options: [
      {
        name: 'title',
        type: 3, // STRING
        description: 'Title of the game',
        required: true,
      },
      {
        name: 'coverart',
        type: 3, // STRING
        description: 'URL of the cover art',
        required: true,
      },
      {
        name: 'description',
        type: 3, // STRING
        description: 'Description of the game',
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

  if (commandName === 'postgame') {
    const title = options.getString('title');
    const coverArtUrl = options.getString('coverart');
    const description = options.getString('description');

    const userId = await saveUser(interaction.user.id, interaction.user.username);
    const gameDetails = { title, coverArtUrl, description };

    try {
      const gameId = await saveGameToDatabase(gameDetails, userId);
      const embed = createGameEmbed(gameDetails, gameId);
      await interaction.reply({ embeds: [embed] });

      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');

    } catch (error) {
      console.error('Error posting game:', error);
      await interaction.reply('Error posting game. Please try again later.');
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
