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

        await interaction.deferReply({ ephemeral: true });

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

        const selectedApp = matchingGames[0];
        console.log('Selected App:', selectedApp);

        const gameResponse = await axios.get(`http://store.steampowered.com/api/appdetails?appids=${selectedApp.appid}&key=${steamApiKey}`);
        const gameData = gameResponse.data[selectedApp.appid].data;
        const title = gameData.name;
        const coverArtUrl = gameData.header_image;
        const price = gameData.price_overview ? gameData.price_overview.final_formatted : 'Free';

        const gameDetails = { title, coverArtUrl, price, playerCount };

        const userId = await saveUser(interaction.user.id, interaction.user.username);

        const gameId = await saveGameToDatabase(gameDetails, userId);

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
        embed.setDescription(`Players needed: ${embed.fields[0].value.split(': ')[1]}\nGame ID: ${gameId}\nPrice: ${embed.fields[1].value.split(': ')[1]}\n\nUpvotes: ${upvoteCount}\n${upvoteUsernames}`);

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
                                  .map(app => ({ name: app.name.substring(0, 100), value: app.appid.toString() })); // Ensure names are within 100 characters

        await interaction.respond(matchingGames);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    } catch (followUpError) {
      console.error('Error sending follow-up message:', followUpError);
    }
  }
});

client.login(botToken);
