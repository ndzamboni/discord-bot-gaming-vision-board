const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase, deleteGameFromDatabase, saveUpvote, getUpvotesForGame } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '727340837423546400';    // Replace with your Discord server's ID
const visionBoardChannelId = '1258046349765640283';  // Replace with your vision board channel ID

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
        name: 'game',
        type: 3, // STRING
        description: 'Start typing the name of the game',
        required: true,
        autocomplete: true,
      },
      {
        name: 'players',
        type: 4, // INTEGER
        description: 'Number of players needed',
        required: true,
      },
    ],
  },
  {
    name: 'deletegame',
    description: 'Delete a game from the vision board',
    options: [
      {
        name: 'gameid',
        type: 4, // INTEGER
        description: 'The game ID to delete',
        required: true,
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {
    console.log('Interaction received:', interaction);

    if (interaction.isCommand()) {
      const { commandName } = interaction;
      console.log('Command interaction:', commandName);

      if (commandName === 'bonezoneboard') {
        const gameName = interaction.options.getString('game');
        const playerCount = interaction.options.getInteger('players');
        console.log('Game name provided:', gameName);
        console.log('Number of players:', playerCount);

        await interaction.deferReply({ ephemeral: true });  // Acknowledge the interaction

        const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
        const apps = response.data.applist.apps;
        console.log(`Total number of apps received: ${apps.length}`);

        const isNumeric = !isNaN(gameName);
        let matchingGames = [];

        if (isNumeric) {
          matchingGames = apps.filter(app => app.appid.toString() === gameName);
        } else {
          const lowerCaseGameName = gameName.toLowerCase();
          matchingGames = apps.filter(app => app.name.toLowerCase().includes(lowerCaseGameName))
                              .sort((a, b) => {
                                const aStartsWith = a.name.toLowerCase().startsWith(lowerCaseGameName);
                                const bStartsWith = b.name.toLowerCase().startsWith(lowerCaseGameName);
                                if (aStartsWith && !bStartsWith) return -1;
                                if (!aStartsWith && bStartsWith) return 1;
                                return a.name.length - b.name.length;
                              });
        }

        console.log('Matching games:', matchingGames.map(game => game.name));

        if (matchingGames.length === 0) {
          await interaction.editReply('No games found with that name.');
          return;
        }

        const selectedApp = matchingGames[0]; // Automatically select the first matching game
        console.log('Selected App:', selectedApp);

        const gameResponse = await axios.get(`http://store.steampowered.com/api/appdetails?appids=${selectedApp.appid}&key=${steamApiKey}`);
        const gameData = gameResponse.data[selectedApp.appid].data;
        const title = gameData.name;
        const coverArtUrl = gameData.header_image;
        const price = gameData.price_overview ? gameData.price_overview.final_formatted : 'Free';

        const gameDetails = { title, coverArtUrl, price };

        const userId = await saveUser(interaction.user.id, interaction.user.username);

        const gameId = await saveGameToDatabase({ ...gameDetails, playerCount }, userId);

        const embed = new EmbedBuilder()
          .setTitle(gameDetails.title)
          .setDescription(`Players needed: ${playerCount}\nGame ID: ${gameId}\nPrice: ${gameDetails.price}`)
          .setImage(gameDetails.coverArtUrl)
          .setFooter({ text: `Game ID: ${gameId}` });

        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_${gameId}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);

        const upvoteButton = new ButtonBuilder()
          .setCustomId(`upvote_${gameId}`)
          .setLabel('Upvote')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(deleteButton, upvoteButton);

        const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
        const message = await visionBoardChannel.send({ embeds: [embed], components: [row] });

        await interaction.deleteReply();
      } else if (commandName === 'deletegame') {
        const gameId = interaction.options.getInteger('gameid');
        console.log('Game ID to delete:', gameId);

        const success = await deleteGameFromDatabase(gameId);
        if (success) {
          await interaction.reply({ content: 'Game deleted successfully.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Failed to delete the game.', ephemeral: true });
        }
      }
    } else if (interaction.isButton()) {
      const customId = interaction.customId;
      console.log('Button interaction:', customId);

      const [action, gameId] = customId.split('_');

      if (action === 'delete') {
        const success = await deleteGameFromDatabase(gameId);
        if (success) {
          await interaction.message.delete();
          await interaction.reply({ content: 'Game deleted successfully.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Failed to delete the game.', ephemeral: true });
        }
      } else if (action === 'upvote') {
        await saveUpvote(gameId, interaction.user.id);

        const upvotes = await getUpvotesForGame(gameId);
        const upvoteUsernames = upvotes.map(row => row.username).join('\n');
        const upvoteCount = upvotes.length;

        const embed = interaction.message.embeds[0];
        embed.setDescription(`Players needed: ${playerCount}\nGame ID: ${gameId}\nPrice: ${price}\n\nUpvotes: ${upvoteCount}\n${upvoteUsernames}`);

        await interaction.message.edit({ embeds: [embed] });
        await interaction.reply({ content: 'Upvoted successfully.', ephemeral: true });
      }
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'game') {
        const searchQuery = focusedOption.value;
        const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
        const apps = response.data.applist.apps;

        const matchingGames = apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .slice(0, 25)
                                  .map(app => ({ name: app.name, value: app.appid.toString() }));

        await interaction.respond(matchingGames);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.login(botToken);
