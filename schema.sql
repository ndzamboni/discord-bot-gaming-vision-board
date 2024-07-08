-- Create the database
-- CREATE DATABASE discord_game_bot;

-- Connect to the database
-- \c discord_game_bot;
-- Drop existing tables if they exist
-- Drop existing tables if they exist
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    cover_art_url VARCHAR(255),
    player_count INTEGER NOT NULL,
    posted_by INTEGER REFERENCES users(id),
    price VARCHAR(255)  -- Added price column
);

CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    user_id INTEGER REFERENCES users(id),
    CONSTRAINT unique_vote UNIQUE (game_id, user_id)  -- Ensure unique votes
);


