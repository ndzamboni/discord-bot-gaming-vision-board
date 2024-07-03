const { Client, GatewayIntentBits, REST, Routes, MessageActionRow, MessageSelectMenu } = require('discord.js');
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
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const commands = [
  {
    name: 'bonezoneboard',
    description: 'Post a game from Steam',
    options: [
      {
        name: 'gamename',
        type: 3, // STRING
        description: 'Name of the game',
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
  if (!interaction.isCommand() && !interaction.isSelectMenu()) return;

  if (interaction.isCommand()) {
    const { commandName, options } = interaction;

    if (commandName === 'bonezoneboard') {
      const gameName = options.getString('gamename');

      try {
        const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
        const apps = response.data.applist.apps;
        const matchingGames = apps.filter(app => app.name.toLowerCase().includes(gameName.toLowerCase()));

        if (matchingGames.length === 0) {
          await interaction.reply('No games found with that name.');
          return;
        }

        const options = matchingGames.slice(0, 25).map(game => ({
          label: game.name,
          value: game.appid.toString(),
        }));

        const row = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId('select-game')
            .setPlaceholder('Select a game')
            .addOptions(options),
        );

        await interaction.reply({ content: 'Select a game from the list:', components: [row] });

      } catch (error) {
        console.error('Failed to fetch games from Steam:', error);
        await interaction.reply('Failed to fetch games from Steam. Please try again later.');
      }
    }
  } else if (interaction.isSelectMenu()) {
    const selectedAppId = interaction.values[0];

    try {
      const response = await axios.get(`http://store.steampowered.com/api/appdetails?appids=${selectedAppId}&key=${steamApiKey}`);
      const gameData = response.data[selectedAppId].data;
      const title = gameData.name;
      const coverArtUrl = gameData.header_image;
      const description = gameData.short_description;

      const gameDetails = { title, coverArtUrl, description };
      const userId = await saveUser(interaction.user.id, interaction.user.username);

      const gameId = await saveGameToDatabase(gameDetails, userId);
      const embed = createGameEmbed(gameDetails, gameId);
      await interaction.update({ content: null, embeds: [embed], components: [] });

      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');

    } catch (error) {
      console.error('Failed to fetch game from Steam:', error);
      await interaction.update('Failed to fetch game details from Steam. Please try again later.');
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
