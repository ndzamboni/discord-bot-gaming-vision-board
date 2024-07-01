const { Client, GatewayIntentBits } = require('discord.js');
const { botToken } = require('./config');
const { saveUser, saveGameToDatabase, updateVoteCount } = require('./database');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.content.startsWith('!postgame')) {
    const userId = await saveUser(message.author.id, message.author.username);
    const gameDetails = parseGameDetails(message.content);

    try {
      const gameId = await saveGameToDatabase(gameDetails, userId);
      const embed = createGameEmbed(gameDetails, gameId);
      const sentMessage = await message.channel.send({ embeds: [embed] });
      
      await sentMessage.react('👍'); // Thumbs up for "Yes"
      await sentMessage.react('👎'); // Thumbs down for "No"

      message.reply('Game posted successfully!');
    } catch (error) {
      console.error('Error posting game:', error);
      message.reply('Error posting game. Please try again later.');
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return; // Ignore bot reactions

  const userId = await saveUser(user.id, user.username);

  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].footer) {
    const gameId = reaction.message.embeds[0].footer.text.split(': ')[1];

    try {
      if (reaction.emoji.name === '👍') {
        await updateVoteCount(gameId, userId, 1);
      } else if (reaction.emoji.name === '👎') {
        await updateVoteCount(gameId, userId, -1);
      }
    } catch (error) {
      console.error('Error updating vote count:', error);
    }
  }
});

function parseGameDetails(messageContent) {
  const [command, title, coverArtUrl, ...description] = messageContent.split(' ');
  return {
    title,
    coverArtUrl,
    description: description.join(' '),
  };
}

function createGameEmbed(gameDetails, gameId) {
  return {
    title: gameDetails.title,
    description: gameDetails.description,
    image: { url: gameDetails.coverArtUrl },
    footer: { text: `Game ID: ${gameId}` },
  };
}

client.login(botToken);
