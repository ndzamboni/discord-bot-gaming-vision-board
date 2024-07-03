const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '727340837423546400';    // Replace with your Discord server's ID
const visionBoardChannelId = '1258046349765640283';  // Replace with your vision board channel ID
let visionBoardMessageId;  // Initially undefined, will be set when the bot posts the initial message

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
    name: 'setvisionboard',
    description: 'Set the vision board message ID',
    options: [
      {
        name: 'messageid',
        type: 3, // STRING
        description: 'The message ID to use for the vision board',
        required: true,
      },
    ],
  },
  {
    name: 'createvisionboard',
    description: 'Create the initial vision board message',
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

  // Create the initial vision board message if it doesn't exist
  const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
  const messages = await visionBoardChannel.messages.fetch({ limit: 100 });

  const visionBoardMessage = messages.find(msg => msg.content.startsWith('Dynamically add games to this vision board'));

  if (!visionBoardMessage) {
    const initialMessage = await visionBoardChannel.send('Dynamically add games to this vision board to see who would be interested in playing certain games! This will be a good way to get groups together and gauge interest in a game. Use the /bonezoneboard command to insert a game!');
    visionBoardMessageId = initialMessage.id;
    console.log(`Vision board message created with ID: ${visionBoardMessageId}`);
  } else {
    visionBoardMessageId = visionBoardMessage.id;
    console.log(`Vision board message found with ID: ${visionBoardMessageId}`);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    console.log('Interaction received:', interaction);

    if (interaction.isCommand()) {
      const { commandName } = interaction;
      console.log('Command interaction:', commandName);

      if (commandName === 'createvisionboard') {
        const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
        const initialMessage = await visionBoardChannel.send('Dynamically add games to this vision board to see who would be interested in playing certain games! This will be a good way to get groups together and gauge interest in a game. Use the /bonezoneboard command to insert a game!');
        visionBoardMessageId = initialMessage.id;
        await interaction.reply(`Vision board message created with ID: ${visionBoardMessageId}`);
        return;
      }

      if (commandName === 'setvisionboard') {
        visionBoardMessageId = interaction.options.getString('messageid');
        await interaction.reply(`Vision board message ID set to ${visionBoardMessageId}`);
        return;
      }

      if (commandName === 'bonezoneboard') {
        const gameName = interaction.options.getString('game');
        const playerCount = interaction.options.getInteger('players');
        console.log('Game name provided:', gameName);
        console.log('Number of players:', playerCount);

        await interaction.deferReply();  // Acknowledge the interaction

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
        const description = gameData.short_description;
        const price = gameData.price_overview ? `${gameData.price_overview.final_formatted}` : 'Free';

        const gameDetails = { title, coverArtUrl, description, price };

        const userId = await saveUser(interaction.user.id, interaction.user.username);

        const gameId = await saveGameToDatabase({ ...gameDetails, playerCount }, userId);

        const embed = new EmbedBuilder()
          .setTitle(gameDetails.title)
          .setDescription(`${gameDetails.description}\n\nPrice: ${gameDetails.price}\nPlayers needed: ${playerCount}`)
          .setImage(gameDetails.coverArtUrl)
          .setFooter({ text: `Game ID: ${gameId}` });

        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_${gameId}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
          .addComponents(deleteButton);

        await interaction.editReply({ content: null, embeds: [embed], components: [row] });

        const message = await interaction.fetchReply();
        try {
          await message.react('👍');
          await message.react('👎');
        } catch (reactionError) {
          console.error('Error adding reactions:', reactionError);
        }

        // Fetch the vision board message
        const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
        let visionBoardMessage = await visionBoardChannel.messages.fetch(visionBoardMessageId);

        // Ensure the message to be updated is authored by the bot
        if (visionBoardMessage.author.id !== client.user.id) {
          console.error('Vision board message not authored by the bot.');
          return;
        }

        // Append the new game tile to the existing vision board message content
        const newTile = `**${gameDetails.title}**\n${gameDetails.description}\nPrice: ${gameDetails.price}\nPlayers needed: ${playerCount}\n![Cover Art](${gameDetails.coverArtUrl})`;

        let updatedContent = visionBoardMessage.content + '\n\n' + newTile;

        // Split content into multiple messages if it exceeds the limit
        while (updatedContent.length > 2000) {
          const splitIndex = updatedContent.lastIndexOf('\n\n', 2000);
          const firstPart = updatedContent.substring(0, splitIndex);
          const remainingPart = updatedContent.substring(splitIndex);

          await visionBoardMessage.edit(firstPart);

          // Send a new message with the remaining content
          const newMessage = await visionBoardChannel.send(remainingPart.trim());
          visionBoardMessageId = newMessage.id;
          visionBoardMessage = newMessage;

          updatedContent = remainingPart.trim();
        }

        // Update the vision board message
        await visionBoardMessage.edit(updatedContent);

        // Delete the user's original message
        await interaction.deleteReply();
      }
    } else if (interaction.isButton()) {
      const [action, gameId] = interaction.customId.split('_');

      if (action === 'delete') {
        // Fetch the vision board message
        const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
        let visionBoardMessage = await visionBoardChannel.messages.fetch(visionBoardMessageId);

        // Ensure the message to be updated is authored by the bot
        if (visionBoardMessage.author.id !== client.user.id) {
          console.error('Vision board message not authored by the bot.');
          return;
        }

        const gameRegex = new RegExp(`\\*\\*${gameId}\\*\\*[^\\*]*Price:[^\\*]*Players needed:[^\\*]*!\\[Cover Art\\][^\\*]*`);

        // Remove the game details from the vision board message content
        const updatedContent = visionBoardMessage.content.replace(gameRegex, '').trim();

        await visionBoardMessage.edit(updatedContent);
        await interaction.reply({ content: 'Game removed from the vision board.', ephemeral: true });
      }
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);
      const query = focusedOption.value;

      if (focusedOption.name === 'game') {
        const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
        const apps = response.data.applist.apps;

        const lowerCaseQuery = query.toLowerCase();
        const matchingGames = apps
          .filter(app => app.name.toLowerCase().includes(lowerCaseQuery))
          .sort((a, b) => {
            const aStartsWith = a.name.toLowerCase().startsWith(lowerCaseQuery);
            const bStartsWith = b.name.toLowerCase().startsWith(lowerCaseQuery);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.name.length - b.name.length;
          })
          .slice(0, 25)
          .map(app => ({ name: app.name, value: app.appid.toString() }));

        await interaction.respond(matchingGames);
      }
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

client.login(botToken);
