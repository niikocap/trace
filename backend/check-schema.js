const database = require('./config/database');

async function checkSchema() {
    try {
        await database.connect();
        
        // Check production_seasons table schema
        const schema = await database.all(`PRAGMA table_info(production_seasons)`);
        console.log('Production seasons table schema:');
        schema.forEach(col => {
            console.log(`  ${col.name}: ${col.type}`);
        });
        
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        await database.close();
    }
}

checkSchema();
