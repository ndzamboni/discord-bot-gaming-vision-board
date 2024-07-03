const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '727340837423546400';    // Replace with your Discord server's ID
const visionBoardChannelId = '1258046349765640283';  // Replace with your vision board channel ID
let visionBoardMessageId = '1258047370319630367';  // Replace with your initial vision board message ID

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

      if (commandName === 'setvisionboard') {
        visionBoardMessageId = options.getString('messageid');
        await interaction.reply(`Vision board message ID set to ${visionBoardMessageId}`);
        return;
      }

      if (commandName === 'bonezoneboard') {
        const gameName = options.getString('gamename');
        const players = options.getInteger('players');
        console.log('Game name provided:', gameName);
        console.log('Number of players:', players);

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

        const gameOptions = matchingGames.slice(0, 25).map(game => ({
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

        await interaction.editReply({ content: 'Select a game from the list and enter the number of players:', components: [row] });
      }
    } else if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused();
      const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
      const apps = response.data.applist.apps;
      const lowerCaseFocusedOption = focusedOption.toLowerCase();
      const matchingGames = apps.filter(app => app.name.toLowerCase().includes(lowerCaseFocusedOption))
                                .sort((a, b) => {
                                  const aStartsWith = a.name.toLowerCase().startsWith(lowerCaseFocusedOption);
                                  const bStartsWith = b.name.toLowerCase().startsWith(lowerCaseFocusedOption);
                                  if (aStartsWith && !bStartsWith) return -1;
                                  if (!aStartsWith && bStartsWith) return 1;
                                  return a.name.length - b.name.length;
                                })
                                .slice(0, 25);  // Limit to 25 results

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
      const price = gameData.price_overview ? `${gameData.price_overview.final_formatted}` : 'Free';

      const gameDetails = { title, coverArtUrl, description, price };

      const modal = new ModalBuilder()
        .setCustomId('playerModal')
        .setTitle('Number of Players')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('playerCount')
              .setLabel('How many players are needed?')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
      interaction.client.once('interactionCreate', async modalInteraction => {
        if (!modalInteraction.isModalSubmit()) return;
        const playerCount = modalInteraction.fields.getTextInputValue('playerCount');

        const userId = await saveUser(modalInteraction.user.id, modalInteraction.user.username);

        const gameId = await saveGameToDatabase({ ...gameDetails, playerCount }, userId);

        const embed = new EmbedBuilder()
          .setTitle(gameDetails.title)
          .setDescription(`${gameDetails.description}\n\nPrice: ${gameDetails.price}\nPlayers needed: ${playerCount}`)
          .setImage(gameDetails.coverArtUrl)
          .setFooter({ text: `Game ID: ${gameId}` });

        await modalInteraction.update({ content: null, embeds: [embed], components: [] });

        const message = await modalInteraction.fetchReply();
        try {
          await message.react('👍');
          await message.react('👎');
        } catch (reactionError) {
          console.error('Error adding reactions:', reactionError);
        }

        // Fetch the vision board message
        const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
        const visionBoardMessage = await visionBoardChannel.messages.fetch(visionBoardMessageId);

        // Append the new game tile to the existing vision board message content
        const newTile = `\n**${gameDetails.title}**\n${gameDetails.description}\nPrice: ${gameDetails.price}\nPlayers needed: ${playerCount}\n![Cover Art](${gameDetails.coverArtUrl})`;
        const updatedContent = visionBoardMessage.content + newTile;

        // Update the vision board message
        await visionBoardMessage.edit(updatedContent);
      });
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
