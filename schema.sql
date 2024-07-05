-- Create the database
-- CREATE DATABASE discord_game_bot;

-- Connect to the database
-- \c discord_game_bot;
-- Drop existing tables if they exist
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL
);

-- Create games table
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  cover_art_url TEXT NOT NULL,
  player_count INTEGER NOT NULL,
  posted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  price TEXT NOT NULL
);

-- Create votes table
CREATE TABLE votes (
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, user_id)
);





