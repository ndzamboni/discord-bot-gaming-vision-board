const { Pool } = require('pg');
const { databaseConfig } = require('./config');

const pool = new Pool(databaseConfig);

async function saveUser(discordId, username) {
  const result = await pool.query(
    'INSERT INTO users (discord_id, username) VALUES ($1, $2) ON CONFLICT (discord_id) DO UPDATE SET username = EXCLUDED.username RETURNING id',
    [discordId, username]
  );
  return result.rows[0].id;
}

async function saveGameToDatabase(gameDetails, userId) {
  const result = await pool.query(
    'INSERT INTO games (title, cover_art_url, player_count, posted_by) VALUES ($1, $2, $3, $4) RETURNING id',
    [gameDetails.title, gameDetails.coverArtUrl, gameDetails.playerCount, userId]
  );
  return result.rows[0].id;
}

async function deleteGameFromDatabase(gameId) {
  const result = await pool.query('DELETE FROM games WHERE id = $1 RETURNING id', [gameId]);
  return result.rowCount > 0;
}

async function saveUpvote(gameId, userId) {
  const result = await pool.query(
    'INSERT INTO votes (user_id, game_id, vote_type) VALUES ($1, $2, $3) ON CONFLICT (user_id, game_id) DO NOTHING RETURNING id',
    [userId, gameId, 'upvote']
  );
  return result.rowCount > 0;
}

async function getUpvotes(gameId) {
  const result = await pool.query(
    'SELECT u.username FROM votes v JOIN users u ON v.user_id = u.id WHERE v.game_id = $1 AND v.vote_type = $2',
    [gameId, 'upvote']
  );
  return {
    count: result.rowCount,
    users: result.rows.map(row => row.username),
  };
}

module.exports = {
  saveUser,
  saveGameToDatabase,
  deleteGameFromDatabase,
  saveUpvote,
  getUpvotes,
};
