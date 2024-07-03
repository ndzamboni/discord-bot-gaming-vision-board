const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
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
        autocomplete: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(botToken);

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
    console.log('Interaction received:', interaction);

    if (interaction.isCommand()) {
      const { commandName, options } = interaction;
      console.log('Command interaction:', commandName);

      if (commandName === 'bonezoneboard') {
        const gameName = options.getString('gamename');
        console.log('Game name provided:', gameName);

        await interaction.deferReply();  // Acknowledge the interaction

        const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
        const apps = response.data.applist.apps;
        console.log(`Total number of apps received: ${apps.length}`);

        const isNumeric = !isNaN(gameName);
        let matchingGames = [];

        if (isNumeric) {
          matchingGames = apps.filter(app => app.appid.toString() === gameName);
        } else {
          matchingGames = apps.filter(app => app.name.toLowerCase().includes(gameName.toLowerCase()));
        }

        console.log('Matching games:', matchingGames.map(game => game.name));

        if (matchingGames.length === 0) {
          await interaction.editReply('No games found with that name.');
          return;
        }

        const gameOptions = matchingGames.slice(0, 10).map(game => ({
          label: game.name,
          description: `App ID: ${game.appid}`,
          value: game.appid.toString(),
        }));

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select-game')
            .setPlaceholder('Select a game')
            .addOptions(gameOptions),
        );

        await interaction.editReply({ content: 'Select a game from the list:', components: [row] });
      }
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused();
      const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
      const apps = response.data.applist.apps;
      const matchingGames = apps.filter(app => app.name.toLowerCase().includes(focusedOption.toLowerCase()))
                                .slice(0, 25)  // Show more results to help user find the correct game
                                .filter(app => app.name.length <= 100);  // Ensure name length is within Discord's limits

      await interaction.respond(
        matchingGames.map(game => ({
          name: game.name,
          value: game.appid.toString(),
        })),
      );
    } else if (interaction.isStringSelectMenu()) {
      console.log('Select menu interaction:', interaction.values);

      const selectedAppId = interaction.values[0];
      console.log('Selected App ID:', selectedAppId);

      const response = await axios.get(`http://store.steampowered.com/api/appdetails?appids=${selectedAppId}&key=${steamApiKey}`);
      const gameData = response.data[selectedAppId].data;
      const title = gameData.name;
      const coverArtUrl = gameData.header_image;
      const description = gameData.short_description;

      const gameDetails = { title, coverArtUrl, description };
      const userId = await saveUser(interaction.user.id, interaction.user.username);

      const gameId = await saveGameToDatabase(gameDetails, userId);

      const embed = new EmbedBuilder()
        .setTitle(gameDetails.title)
        .setDescription(gameDetails.description)
        .setImage(gameDetails.coverArtUrl)
        .setFooter({ text: `Game ID: ${gameId}` });

      await interaction.update({ content: null, embeds: [embed], components: [] });

      const message = await interaction.fetchReply();
      await message.react('👍');
      await message.react('👎');
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while processing your request. Please try again later.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while processing your request. Please try again later.', ephemeral: true });
      }
    } catch (followUpError) {
      console.error('Error sending follow-up message:', followUpError);
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
