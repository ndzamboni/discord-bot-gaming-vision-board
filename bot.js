const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { botToken, steamApiKey } = require('./config');
const { saveUser, saveGameToDatabase, deleteGameFromDatabase } = require('./database');

const clientId = '1257339880459997255';  // Replace with your bot's client ID
const guildId = '727340837423546400';    // Replace with your Discord server's ID
const visionBoardChannelId = '1258046349765640283';  // Replace with your vision board channel ID

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
    description: 'Post a new game',
    options: [
      {
        name: 'game',
        type: 3, // STRING
        description: 'Name of the game',
        required: true,
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
    description: 'Delete a game',
    options: [
      {
        name: 'gameid',
        type: 4, // INTEGER
        description: 'ID of the game to delete',
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
    await interaction.deferReply({ ephemeral: true });
    const gameName = options.getString('game');
    const playerCount = options.getInteger('players');

    const userId = await saveUser(interaction.user.id, interaction.user.username);

    // Fetch game details from Steam API
    const gameDetails = await fetchGameDetailsFromSteam(gameName);

    if (!gameDetails) {
      await interaction.followUp({ content: 'Game not found.', ephemeral: true });
      return;
    }

    gameDetails.playerCount = playerCount;
    const gameId = await saveGameToDatabase(gameDetails, userId);

    const embed = new EmbedBuilder()
      .setTitle(gameDetails.name)
      .setDescription(`Players needed: ${playerCount}`)
      .setImage(gameDetails.coverArtUrl);

    const button = new ButtonBuilder()
      .setCustomId(`delete_${gameId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
      .addComponents(button);

    const message = await interaction.followUp({ embeds: [embed], components: [row], fetchReply: true });

    // Move the message to the vision board channel
    const visionBoardChannel = await client.channels.fetch(visionBoardChannelId);
    if (visionBoardChannel) {
      await visionBoardChannel.send({ embeds: [embed], components: [row] });
      await message.delete();
    }
  }

  if (commandName === 'deletegame') {
    await interaction.deferReply({ ephemeral: true });
    const gameId = options.getInteger('gameid');

    const success = await deleteGameFromDatabase(gameId);
    if (success) {
      await interaction.followUp({ content: `Game with ID ${gameId} deleted.`, ephemeral: true });
    } else {
      await interaction.followUp({ content: `Game with ID ${gameId} not found.`, ephemeral: true });
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  if (customId.startsWith('delete_')) {
    const gameId = customId.split('_')[1];
    const success = await deleteGameFromDatabase(gameId);

    if (success) {
      await interaction.update({ content: 'Game deleted.', components: [] });
      await interaction.message.delete();
    } else {
      await interaction.followUp({ content: `Game with ID ${gameId} not found.`, ephemeral: true });
    }
  }
});

async function fetchGameDetailsFromSteam(gameName) {
  try {
    const response = await axios.get(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
    const games = response.data.applist.apps;
    const game = games.find(g => g.name.toLowerCase() === gameName.toLowerCase());

    if (!game) {
      return null;
    }

    const gameDetailsResponse = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&key=${steamApiKey}`);
    const gameDetails = gameDetailsResponse.data[game.appid].data;

    return {
      name: gameDetails.name,
      coverArtUrl: gameDetails.header_image,
    };
  } catch (error) {
    console.error('Error fetching game details from Steam:', error);
    return null;
  }
}

client.login(botToken);
