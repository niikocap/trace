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

        // Create chain_actors table
        await database.run(`
            CREATE TABLE IF NOT EXISTS chain_actors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                type ENUM('farmer', 'miller', 'distributor', 'retailer') NOT NULL,
                contact_info TEXT,
                location VARCHAR(255),
                certification_details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create production_seasons table
        await database.run(`
            CREATE TABLE IF NOT EXISTS production_seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season_name VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                expected_yield DECIMAL(10,2),
                actual_yield DECIMAL(10,2),
                weather_conditions TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create milled_rice table
        await database.run(`
            CREATE TABLE IF NOT EXISTS milled_rice (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                rice_variety VARCHAR(255) NOT NULL,
                grade VARCHAR(50),
                milling_date DATE NOT NULL,
                miller_id INTEGER NOT NULL,
                quantity_milled DECIMAL(10,2) NOT NULL,
                milling_yield_percentage DECIMAL(5,2),
                quality_parameters TEXT,
                storage_location VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (miller_id) REFERENCES chain_actors(id)
            )
        `);

        // Create rice_batches table
        await database.run(`
            CREATE TABLE IF NOT EXISTS rice_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_number VARCHAR(255) UNIQUE NOT NULL,
                farmer_id INTEGER NOT NULL,
                production_season_id INTEGER NOT NULL,
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
                FOREIGN KEY (production_season_id) REFERENCES production_seasons(id)
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
        INSERT OR IGNORE INTO production_seasons (season_name, start_date, end_date, expected_yield, weather_conditions)
        VALUES 
        ('Spring 2024', '2024-03-01', '2024-08-31', 1500.00, 'Favorable rainfall'),
        ('Fall 2024', '2024-09-01', '2025-02-28', 1200.00, 'Dry season with irrigation')
    `);
    
    // Sample rice batches
    await database.run(`
        INSERT OR IGNORE INTO rice_batches (batch_number, farmer_id, production_season_id, rice_variety, planting_date, harvest_date, quantity_harvested, quality_grade)
        VALUES 
        ('BATCH-2024-001', 1, 1, 'Jasmine Rice', '2024-03-15', '2024-07-20', 500.00, 'Grade A'),
        ('BATCH-2024-002', 1, 1, 'Basmati Rice', '2024-03-20', '2024-07-25', 450.00, 'Grade A')
    `);
    
    // Sample milled rice
    await database.run(`
        INSERT OR IGNORE INTO milled_rice (batch_id, rice_variety, grade, milling_date, miller_id, quantity_milled, milling_yield_percentage)
        VALUES 
        (1, 'Jasmine Rice', 'Premium', '2024-08-01', 2, 450.00, 90.00),
        (2, 'Basmati Rice', 'Premium', '2024-08-05', 2, 400.00, 88.89)
    `);
    
    console.log('Sample data inserted successfully!');
}

if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };