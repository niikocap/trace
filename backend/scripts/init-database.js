const fs = require('fs');
const path = require('path');
const database = require('../config/database');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

async function initializeDatabase() {
    try {
        await database.connect();
        console.log('Initializing database schema...');

        // Drop existing tables to ensure clean schema
        await database.run('DROP TABLE IF EXISTS transactions');
        await database.run('DROP TABLE IF EXISTS milled_rice');
        await database.run('DROP TABLE IF EXISTS rice_batches');
        await database.run('DROP TABLE IF EXISTS production_seasons');
        await database.run('DROP TABLE IF EXISTS chain_actors');

        // Create chain_actors table
        await database.run(`
            CREATE TABLE chain_actors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                type TEXT NOT NULL,
                contact_info TEXT,
                location VARCHAR(255),
                certification_details TEXT,
                \`group\` VARCHAR(50),
                farmer_id VARCHAR(255),
                assign_tps VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create production_seasons table
        await database.run(`
            CREATE TABLE production_seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES chain_actors(id)
            )
        `);

        // Create milled_rice table
        await database.run(`
            CREATE TABLE milled_rice (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (miller_id) REFERENCES chain_actors(id),
                FOREIGN KEY (batch_id) REFERENCES rice_batches(id)
            )
        `);

        // Create rice_batches table
        await database.run(`
            CREATE TABLE rice_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES chain_actors(id),
                FOREIGN KEY (production_season_id) REFERENCES production_seasons(id),
                FOREIGN KEY (milling_id) REFERENCES milled_rice(id),
                FOREIGN KEY (validator_id) REFERENCES chain_actors(id)
            )
        `);

        // Create transactions table to match blockchain structure
        await database.run(`
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_actor_id) REFERENCES chain_actors(id),
                FOREIGN KEY (to_actor_id) REFERENCES chain_actors(id)
            )
        `);

        // Create indexes
        await database.run('CREATE INDEX IF NOT EXISTS idx_chain_actors_type ON chain_actors(type)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_production_seasons_dates ON production_seasons(start_date, end_date)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_milled_rice_batch ON milled_rice(batch_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_milled_rice_miller ON milled_rice(miller_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_rice_batches_farmer ON rice_batches(farmer_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_rice_batches_season ON rice_batches(production_season_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_rice_batches_batch_number ON rice_batches(batch_number)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_from_actor ON transactions(from_actor_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_to_actor ON transactions(to_actor_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_key ON transactions(blockchain_public_key)');

        console.log('Database schema initialized successfully!');
        
        // Insert sample data
        await insertSampleData();
        
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await database.close();
    }
}

async function insertSampleData() {
    console.log('Inserting sample data...');
    
    // Sample chain actors
    await database.run(`
        INSERT OR IGNORE INTO chain_actors (name, type, contact_info, location, certification_details)
        VALUES 
        ('Green Valley Farm', 'farmer', 'contact@greenvalley.com', 'Rural District A', 'Organic Certification'),
        ('Premium Rice Mills', 'miller', 'info@premiumrice.com', 'Industrial Zone B', 'ISO 9001 Certified'),
        ('Fresh Distribution Co', 'distributor', 'sales@freshdist.com', 'City Center', 'Food Safety Certified'),
        ('Local Market Store', 'retailer', 'manager@localmarket.com', 'Downtown', 'Retail License')
    `);
    
    // Sample production seasons
    await database.run(`
        INSERT OR IGNORE INTO production_seasons (season_name, start_date, end_date, planting_date, harvesting_date, variety, carbon_certified, farmer_id, expected_yield, weather_conditions)
        VALUES 
        ('Spring 2024', '2024-03-01', '2024-08-31', '2024-03-15', '2024-07-20', 'Jasmine Rice', 1, 1, 1500.00, 'Favorable rainfall'),
        ('Fall 2024', '2024-09-01', '2025-02-28', '2024-09-15', '2025-01-15', 'Basmati Rice', 0, 1, 1200.00, 'Dry season with irrigation')
    `);
    
    // Sample rice batches
    await database.run(`
        INSERT OR IGNORE INTO rice_batches (batch_id, batch_number, farmer_id, production_season_id, rice_variety, planting_date, harvest_date, quantity_harvested, quality_grade)
        VALUES 
        ('BATCH-001', 'BATCH-2024-001', 1, 1, 'Jasmine Rice', '2024-03-15', '2024-07-20', 500.00, 'Grade A'),
        ('BATCH-002', 'BATCH-2024-002', 1, 1, 'Basmati Rice', '2024-03-20', '2024-07-25', 450.00, 'Grade A')
    `);
    
    // Sample milled rice
    await database.run(`
        INSERT OR IGNORE INTO milled_rice (batch_id, rice_variety, grade, milling_date, miller_id, input_quantity, output_quantity, quality, machine, milling_yield_percentage)
        VALUES 
        (1, 'Jasmine Rice', 'Premium', '2024-08-01', 2, 500.00, 450.00, 'premium', 'mobile_rice_mill_type_1', 90.00),
        (2, 'Basmati Rice', 'Premium', '2024-08-05', 2, 450.00, 400.00, 'grade_a', 'mobile_rice_mill_type_2', 88.89)
    `);
    
    // Sample transactions
    await database.run(`
        INSERT OR IGNORE INTO transactions (
            transaction_id, transaction_type, from_actor_id, to_actor_id, 
            batch_ids, quantity, unit_price, total_amount, payment_reference,
            transaction_date, status, notes, blockchain_verified
        )
        VALUES 
        ('TXN-2024-001', 'sale', 1, 2, '[1]', '500.00', '2.50', '1250.00', '["PAY-001"]', '2024-07-21T10:00:00Z', 'completed', 'First batch sale to miller', 0),
        ('TXN-2024-002', 'sale', 2, 3, '[1]', '450.00', '3.00', '1350.00', '["PAY-002"]', '2024-08-02T14:30:00Z', 'completed', 'Milled rice to distributor', 0),
        ('TXN-2024-003', 'sale', 1, 2, '[2]', '450.00', '2.60', '1170.00', '["PAY-003"]', '2024-07-26T09:15:00Z', 'completed', 'Second batch sale to miller', 0),
        ('TXN-2024-004', 'sale', 3, 4, '[1]', '200.00', '4.00', '800.00', '["PAY-004"]', '2024-08-10T16:45:00Z', 'pending', 'Partial delivery to retailer', 0)
    `);
    
    console.log('Sample data inserted successfully!');
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };