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
  try {
    await pool.query(query, values);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('You have already voted for this game.');
    }
    throw error;
  }
}

async function removeUpvote(gameId, discordId) {
  const query = `
    DELETE FROM votes
    WHERE game_id = $1 AND user_id = (SELECT id FROM users WHERE discord_id = $2)
  `;
  const values = [gameId, discordId];
  const result = await pool.query(query, values);
  if (result.rowCount === 0) {
    throw new Error('No upvote found for this game by this user.');
  }
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
  removeUpvote,
  getUpvotesForGame,
};
