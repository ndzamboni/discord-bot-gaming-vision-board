const { Pool } = require('pg');
const { dbConfig } = require('./config');

const pool = new Pool(dbConfig);

async function saveUser(discordId, username) {
  const query = `
    INSERT INTO users (discord_id, username)
    VALUES ($1, $2)
    ON CONFLICT (discord_id) DO UPDATE SET username = EXCLUDED.username
    RETURNING id
  `;
  const values = [discordId, username];
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

async function saveGameToDatabase(gameDetails, userId) {
  const query = `
    INSERT INTO games (title, cover_art_url, player_count, price, posted_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const values = [gameDetails.title, gameDetails.coverArtUrl, gameDetails.playerCount, gameDetails.price, userId];
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

async function deleteGameFromDatabase(gameId) {
  const query = `
    DELETE FROM games WHERE id = $1
  `;
  const values = [gameId];
  const result = await pool.query(query, values);
  return result.rowCount > 0;
}

async function saveUpvote(gameId, discordId, username) {
  await saveUser(discordId, username); // Ensure the user is saved first

  const query = `
    INSERT INTO votes (game_id, user_id)
    VALUES ($1, (SELECT id FROM users WHERE discord_id = $2))
  `;
  const values = [gameId, discordId];
  await pool.query(query, values);
}

async function getUpvotesForGame(gameId) {
  const query = `
    SELECT u.username
    FROM votes v
    JOIN users u ON v.user_id = u.id
    WHERE v.game_id = $1
  `;
  const values = [gameId];
  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = {
  saveUser,
  saveGameToDatabase,
  deleteGameFromDatabase,
  saveUpvote,
  getUpvotesForGame,
};
