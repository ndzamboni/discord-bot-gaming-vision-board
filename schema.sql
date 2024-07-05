-- Create the database
-- CREATE DATABASE discord_game_bot;

-- Connect to the database
-- \c discord_game_bot;
-- Drop existing tables if they exist
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cover_art_url VARCHAR(255) NOT NULL,
  player_count INTEGER NOT NULL,
  posted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  price VARCHAR(50) NOT NULL
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);




