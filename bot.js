const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase, createGameEmbed } = require('./database');

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
        autocomplete: true,
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
  try {
    if (interaction.isCommand()) {
      const { commandName, options } = interaction;

      if (commandName === 'bonezoneboard') {
        const gameName = options.getString('gamename');

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
      }
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused();
      const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
      const apps = response.data.applist.apps;
      const matchingGames = apps.filter(app => app.name.toLowerCase().includes(focusedOption.toLowerCase())).slice(0, 25);

      await interaction.respond(
        matchingGames.map(game => ({
          name: game.name,
          value: game.appid.toString(),
        })),
      );
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while processing your request. Please try again later.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while processing your request. Please try again later.', ephemeral: true });
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
