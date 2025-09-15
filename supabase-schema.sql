-- Rice Supply Chain Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chain_actors table
CREATE TABLE IF NOT EXISTS chain_actors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type TEXT NOT NULL,
    contact_info TEXT,
    location VARCHAR(255),
    certification_details TEXT,
    "group" VARCHAR(50),
    farmer_id VARCHAR(255),
    assign_tps VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create production_seasons table
CREATE TABLE IF NOT EXISTS production_seasons (
    id SERIAL PRIMARY KEY,
    season_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planting_date DATE,
    harvesting_date DATE,
    variety VARCHAR(255),
    carbon_certified BOOLEAN DEFAULT FALSE,
    fertilizer_used TEXT,
    pesticide_used TEXT,
    farmer_id INTEGER,
    expected_yield DECIMAL(10,2),
    actual_yield DECIMAL(10,2),
    weather_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (farmer_id) REFERENCES chain_actors(id)
);

-- Create rice_batches table
CREATE TABLE IF NOT EXISTS rice_batches (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(255) UNIQUE NOT NULL,
    batch_number VARCHAR(255) UNIQUE NOT NULL,
    farmer_id INTEGER NOT NULL,
    production_season_id INTEGER NOT NULL,
    milling_id INTEGER,
    validator_id INTEGER,
    dryer VARCHAR(255),
    rice_variety VARCHAR(255) NOT NULL,
    planting_date DATE,
    harvest_date DATE,
    quantity_harvested DECIMAL(10,2),
    quality_grade VARCHAR(50),
    farming_practices TEXT,
    certifications TEXT,
    storage_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (farmer_id) REFERENCES chain_actors(id),
    FOREIGN KEY (production_season_id) REFERENCES production_seasons(id),
    FOREIGN KEY (validator_id) REFERENCES chain_actors(id)
);

-- Create milled_rice table
CREATE TABLE IF NOT EXISTS milled_rice (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL,
    rice_variety VARCHAR(255) NOT NULL,
    grade VARCHAR(50),
    milling_date DATE NOT NULL,
    miller_id INTEGER NOT NULL,
    input_quantity DECIMAL(10,2) NOT NULL,
    output_quantity DECIMAL(10,2) NOT NULL,
    quality VARCHAR(50),
    machine VARCHAR(100),
    milling_yield_percentage DECIMAL(5,2),
    quality_parameters TEXT,
    storage_location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (miller_id) REFERENCES chain_actors(id),
    FOREIGN KEY (batch_id) REFERENCES rice_batches(id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    transaction_type VARCHAR(100) NOT NULL,
    from_actor_id INTEGER NOT NULL,
    to_actor_id INTEGER NOT NULL,
    batch_ids TEXT, -- JSON array of batch IDs
    quantity VARCHAR(50),
    unit_price VARCHAR(50),
    total_amount VARCHAR(50),
    payment_reference TEXT, -- JSON array of payment references
    transaction_date VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    blockchain_public_key VARCHAR(255), -- Solana public key
    blockchain_signature VARCHAR(255), -- Transaction signature
    blockchain_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (from_actor_id) REFERENCES chain_actors(id),
    FOREIGN KEY (to_actor_id) REFERENCES chain_actors(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chain_actors_type ON chain_actors(type);
CREATE INDEX IF NOT EXISTS idx_production_seasons_dates ON production_seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_milled_rice_batch ON milled_rice(batch_id);
CREATE INDEX IF NOT EXISTS idx_milled_rice_miller ON milled_rice(miller_id);
CREATE INDEX IF NOT EXISTS idx_rice_batches_farmer ON rice_batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_rice_batches_season ON rice_batches(production_season_id);
CREATE INDEX IF NOT EXISTS idx_rice_batches_batch_number ON rice_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_actor ON transactions(from_actor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_actor ON transactions(to_actor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_key ON transactions(blockchain_public_key);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE chain_actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rice_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE milled_rice ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for authenticated users
-- You can modify these policies based on your security requirements

CREATE POLICY "Allow all operations for chain_actors" ON chain_actors
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for production_seasons" ON production_seasons
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for rice_batches" ON rice_batches
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for milled_rice" ON milled_rice
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for transactions" ON transactions
    FOR ALL USING (true);
