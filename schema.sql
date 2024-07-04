-- Create the database
-- CREATE DATABASE discord_game_bot;

-- Connect to the database
-- \c discord_game_bot;

-- Drop tables if they exist
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cover_art_url TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  price VARCHAR(50),
  description TEXT,
  release_date VARCHAR(50),
  reviews_score VARCHAR(50)
);

CREATE TABLE votes (
  game_id INTEGER REFERENCES games(id),
  user_id INTEGER REFERENCES users(id),
  vote_type VARCHAR(50),
  PRIMARY KEY (game_id, user_id)
);





