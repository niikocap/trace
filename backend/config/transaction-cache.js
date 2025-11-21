const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/transaction-cache.json');

// Ensure data directory exists
const dataDir = path.dirname(CACHE_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

class TransactionCache {
    constructor() {
        this.cache = this.loadCache();
    }

    loadCache() {
        try {
            if (fs.existsSync(CACHE_FILE)) {
                const data = fs.readFileSync(CACHE_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading transaction cache:', error.message);
        }
        return {};
    }

    saveCache() {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving transaction cache:', error.message);
        }
    }

    // Store transaction metadata by public key
    store(publicKey, metadata) {
        this.cache[publicKey] = {
            ...metadata,
            cached_at: new Date().toISOString()
        };
        this.saveCache();
    }

    // Retrieve transaction metadata by public key
    get(publicKey) {
        return this.cache[publicKey] || null;
    }

    // Get all cached transactions
    getAll() {
        return this.cache;
    }

    // Clear cache
    clear() {
        this.cache = {};
        this.saveCache();
    }
}

module.exports = new TransactionCache();
