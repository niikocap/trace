const database = require('../config/database');

async function initializeSupabase() {
    try {
        await database.connect();
        console.log('Initializing Supabase tables...');

        // Note: Tables should be created in Supabase dashboard or via SQL
        // This script will insert sample data into existing tables
        
        await insertSampleData();
        
    } catch (error) {
        console.error('Error initializing Supabase:', error);
    } finally {
        await database.close();
    }
}

async function insertSampleData() {
    console.log('Inserting sample data into Supabase...');
    
    try {
        // Sample chain actors
        const actors = [
            { name: 'Green Valley Farm', type: 'farmer', contact_info: 'contact@greenvalley.com', location: 'Rural District A', certification_details: 'Organic Certification' },
            { name: 'Premium Rice Mills', type: 'miller', contact_info: 'info@premiumrice.com', location: 'Industrial Zone B', certification_details: 'ISO 9001 Certified' },
            { name: 'Fresh Distribution Co', type: 'distributor', contact_info: 'sales@freshdist.com', location: 'City Center', certification_details: 'Food Safety Certified' },
            { name: 'Local Market Store', type: 'retailer', contact_info: 'manager@localmarket.com', location: 'Downtown', certification_details: 'Retail License' }
        ];

        for (const actor of actors) {
            await database.insert('chain_actors', actor);
        }
        
        // Sample production seasons
        const seasons = [
            { season_name: 'Spring 2024', start_date: '2024-03-01', end_date: '2024-08-31', planting_date: '2024-03-15', harvesting_date: '2024-07-20', variety: 'Jasmine Rice', carbon_certified: true, farmer_id: 1, expected_yield: 1500.00, weather_conditions: 'Favorable rainfall' },
            { season_name: 'Fall 2024', start_date: '2024-09-01', end_date: '2025-02-28', planting_date: '2024-09-15', harvesting_date: '2025-01-15', variety: 'Basmati Rice', carbon_certified: false, farmer_id: 1, expected_yield: 1200.00, weather_conditions: 'Dry season with irrigation' }
        ];

        for (const season of seasons) {
            await database.insert('production_seasons', season);
        }
        
        // Sample rice batches
        const batches = [
            { batch_id: 'BATCH-001', batch_number: 'BATCH-2024-001', farmer_id: 1, production_season_id: 1, rice_variety: 'Jasmine Rice', planting_date: '2024-03-15', harvest_date: '2024-07-20', quantity_harvested: 500.00, quality_grade: 'Grade A' },
            { batch_id: 'BATCH-002', batch_number: 'BATCH-2024-002', farmer_id: 1, production_season_id: 1, rice_variety: 'Basmati Rice', planting_date: '2024-03-20', harvest_date: '2024-07-25', quantity_harvested: 450.00, quality_grade: 'Grade A' }
        ];

        for (const batch of batches) {
            await database.insert('rice_batches', batch);
        }
        
        // Sample milled rice
        const milledRice = [
            { batch_id: 1, rice_variety: 'Jasmine Rice', grade: 'Premium', milling_date: '2024-08-01', miller_id: 2, input_quantity: 500.00, output_quantity: 450.00, quality: 'premium', machine: 'mobile_rice_mill_type_1', milling_yield_percentage: 90.00 },
            { batch_id: 2, rice_variety: 'Basmati Rice', grade: 'Premium', milling_date: '2024-08-05', miller_id: 2, input_quantity: 450.00, output_quantity: 400.00, quality: 'grade_a', machine: 'mobile_rice_mill_type_2', milling_yield_percentage: 88.89 }
        ];

        for (const milled of milledRice) {
            await database.insert('milled_rice', milled);
        }
        
        // Sample transactions
        const transactions = [
            { transaction_id: 'TXN-2024-001', transaction_type: 'sale', from_actor_id: 1, to_actor_id: 2, batch_ids: '[1]', quantity: '500.00', unit_price: '2.50', total_amount: '1250.00', payment_reference: '["PAY-001"]', transaction_date: '2024-07-21T10:00:00Z', status: 'completed', notes: 'First batch sale to miller', blockchain_verified: false },
            { transaction_id: 'TXN-2024-002', transaction_type: 'sale', from_actor_id: 2, to_actor_id: 3, batch_ids: '[1]', quantity: '450.00', unit_price: '3.00', total_amount: '1350.00', payment_reference: '["PAY-002"]', transaction_date: '2024-08-02T14:30:00Z', status: 'completed', notes: 'Milled rice to distributor', blockchain_verified: false },
            { transaction_id: 'TXN-2024-003', transaction_type: 'sale', from_actor_id: 1, to_actor_id: 2, batch_ids: '[2]', quantity: '450.00', unit_price: '2.60', total_amount: '1170.00', payment_reference: '["PAY-003"]', transaction_date: '2024-07-26T09:15:00Z', status: 'completed', notes: 'Second batch sale to miller', blockchain_verified: false },
            { transaction_id: 'TXN-2024-004', transaction_type: 'sale', from_actor_id: 3, to_actor_id: 4, batch_ids: '[1]', quantity: '200.00', unit_price: '4.00', total_amount: '800.00', payment_reference: '["PAY-004"]', transaction_date: '2024-08-10T16:45:00Z', status: 'pending', notes: 'Partial delivery to retailer', blockchain_verified: false }
        ];

        for (const transaction of transactions) {
            await database.insert('transactions', transaction);
        }
        
        console.log('Sample data inserted successfully into Supabase!');
    } catch (error) {
        console.error('Error inserting sample data:', error);
    }
}

if (require.main === module) {
    initializeSupabase();
}

module.exports = { initializeSupabase };
