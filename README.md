# Bonezone Vision Board Discord Bot

The Bonezone Vision Board Discord Bot is a tool designed to facilitate group gaming sessions. Users can dynamically add games to a vision board to gauge interest and form groups for playing together. The bot also allows users to delete games from the vision board.

![Screenshot](/demo/demoBot1.PNG)

![Screenshot](/demo/demoBot2.PNG)

![Screenshot](/demo/demoBot3.PNG)

## Features

- Add games to the vision board with details fetched dynamically from the Steam API.
- Specify the number of players needed for each game.
- Delete games from the vision board.
- Automatically posts game details, including cover art and player count, to a specified channel.
- Utilizes slash commands for user interaction.

## Prerequisites

- Node.js
- npm
- PostgreSQL database

## Installation

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd bonezone-vision-board

2. **Install Dependencies:**
   ```
   npm install

3. **Create a '.env' file in the root directory and add your config:**
   ```
      BOT_TOKEN=your_discord_bot_token
      STEAM_API_KEY=your_steam_api_key
      DATABASE_URL=your_database_url

4. **Set up your PostgreSQL database:**
   ```
   psql -f schema.sql

## Configuration

1. **Ensure your 'config.js' file is correctly set up to read environment variables:**

   ```
   require('dotenv').config();
      module.exports = {
         botToken: process.env.BOT_TOKEN,
         steamApiKey: process.env.STEAM_API_KEY,
         databaseUrl: process.env.DATABASE_URL,
      };

## Usage

1. **Start the bot**
   ```
   npm start

2. **Commands:**

   '/bonezoneboard' - Post a new game to the vision board.

   'game' (string): Name of the game.
   'players' (integer): Number of players desired.

   '/deletegame' - Delete a game from the vision board.

   'gameid' (integer): ID of the game to delete.

 ## File Structure

   ```
      ├── config.js
      ├── database.js
      ├── schema.sql
      ├── bot.js
      ├── .env
      ├── demo
      │   ├── demoBot1.png
      │   ├── demoBot2.png
      │   ├── demoBot3.png
      └── README.md






