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
    INSERT INTO games (title, cover_art_url, description, posted_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const values = [gameDetails.title, gameDetails.coverArtUrl, gameDetails.description, userId];
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

async function updateVoteCount(gameId, userId, vote) {
  const insertQuery = `
    INSERT INTO votes (user_id, game_id, vote)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, game_id) DO UPDATE SET vote = EXCLUDED.vote
  `;
  const insertValues = [userId, gameId, vote];
  await pool.query(insertQuery, insertValues);

  const updateQuery = `
    UPDATE games
    SET votes = (
      SELECT COALESCE(SUM(vote), 0)
      FROM votes
      WHERE game_id = $1
    )
    WHERE id = $1
  `;
  const updateValues = [gameId];
  await pool.query(updateQuery, updateValues);
}

module.exports = {
  saveUser,
  saveGameToDatabase,
  updateVoteCount,
};
