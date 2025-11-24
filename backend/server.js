const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cache control middleware - prevent stale data
app.use((req, res, next) => {
    // Don't cache API responses
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: '1h', // Cache static assets for 1 hour
    etag: false
}));

// Import routes
const transactionRoutes = require('./routes/transactions');
const chainActorRoutes = require('./routes/chainActors');
const productionSeasonRoutes = require('./routes/productionSeasons');
const milledRiceRoutes = require('./routes/milledRice');
const riceBatchRoutes = require('./routes/riceBatches');

// API Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/chain-actors', chainActorRoutes);
app.use('/api/production-seasons', productionSeasonRoutes);
app.use('/api/milled-rice', milledRiceRoutes);
app.use('/api/rice-batches', riceBatchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Rice Supply Chain API is running' });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
});