-- Create the database
-- CREATE DATABASE discord_game_bot;

-- Connect to the database
-- \c discord_game_bot;

DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cover_art_url TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  posted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);





