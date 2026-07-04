-- Harikson AI Platform Database Initialization
-- This script is executed on the first run of the PostgreSQL container.

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
CREATE TABLE IF NOT EXISTS db_init_log (
    id SERIAL PRIMARY KEY,
    initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(100) NOT NULL
);

INSERT INTO db_init_log (status) VALUES ('Database initialized successfully');
