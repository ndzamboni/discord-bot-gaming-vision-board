-- Create the database
CREATE DATABASE discord_game_bot;

-- Connect to the database
\c discord_game_bot;

-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL
);

CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cover_art_url TEXT NOT NULL,
  description TEXT,
  votes INT DEFAULT 0,
  posted_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  game_id INT REFERENCES games(id),
  vote INT NOT NULL, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id)
);
