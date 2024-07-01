const { Pool } = require('pg');
const { dbConfig } = require('./config');

const pool = new Pool(dbConfig);

async function saveGameToDatabase(gameDetails) {
  const query = 'INSERT INTO games (title, cover_art_url, description) VALUES ($1, $2, $3) RETURNING id';
  const values = [gameDetails.title, gameDetails.coverArtUrl, gameDetails.description];
  const result = await pool.query(query, values);
  return result;
}

async function updateVoteCount(gameId, vote) {
  const query = 'UPDATE games SET votes = votes + $1 WHERE id = $2';
  const values = [vote, gameId];
  await pool.query(query, values);
}

module.exports = {
  saveGameToDatabase,
  updateVoteCount,
};
