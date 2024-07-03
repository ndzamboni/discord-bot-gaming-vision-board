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
    INSERT INTO games (title, cover_art_url, player_count, posted_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const values = [gameDetails.title, gameDetails.coverArtUrl, gameDetails.playerCount, userId];
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

async function deleteGameFromDatabase(gameId) {
  const query = `
    DELETE FROM games
    WHERE id = $1
    RETURNING id
  `;
  const values = [gameId];
  const result = await pool.query(query, values);
  return result.rowCount > 0;
}

module.exports = {
  saveUser,
  saveGameToDatabase,
  deleteGameFromDatabase,
};
