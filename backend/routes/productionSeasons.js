const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/production-seasons - Get all production seasons
router.get('/', async (req, res) => {
    try {
        const seasons = await database.all('SELECT * FROM production_seasons ORDER BY start_date DESC');
        res.json({
            success: true,
            data: seasons,
            count: seasons.length
        });
    } catch (error) {
        console.error('Error fetching production seasons:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch production seasons',
            message: error.message
        });
    }
});

// GET /api/production-seasons/:id - Get production season by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const season = await database.get('SELECT * FROM production_seasons WHERE id = ?', [id]);
        
        if (!season) {
            return res.status(404).json({
                success: false,
                error: 'Production season not found'
            });
        }
        
        res.json({
            success: true,
            data: season
        });
    } catch (error) {
        console.error('Error fetching production season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch production season',
            message: error.message
        });
    }
});

// POST /api/production-seasons - Create production season
router.post('/', async (req, res) => {
    try {
        const {
            season_name,
            start_date,
            end_date,
            expected_yield,
            actual_yield,
            weather_conditions,
            notes
        } = req.body;
        
        // Validate required fields
        if (!season_name || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: season_name, start_date, end_date'
            });
        }
        
        // Validate date format and logic
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD format'
            });
        }
        
        if (startDate >= endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date must be before end date'
            });
        }
        
        const result = await database.run(
            `INSERT INTO production_seasons (
                season_name, start_date, end_date, expected_yield, actual_yield,
                weather_conditions, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                season_name,
                start_date,
                end_date,
                expected_yield || null,
                actual_yield || null,
                weather_conditions || null,
                notes || null
            ]
        );
        
        const newSeason = await database.get('SELECT * FROM production_seasons WHERE id = ?', [result.id]);
        
        res.status(201).json({
            success: true,
            data: newSeason,
            message: 'Production season created successfully'
        });
        
    } catch (error) {
        console.error('Error creating production season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create production season',
            message: error.message
        });
    }
});

// PUT /api/production-seasons/:id - Update production season
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            season_name,
            start_date,
            end_date,
            expected_yield,
            actual_yield,
            weather_conditions,
            notes
        } = req.body;
        
        // Check if season exists
        const existingSeason = await database.get('SELECT * FROM production_seasons WHERE id = ?', [id]);
        if (!existingSeason) {
            return res.status(404).json({
                success: false,
                error: 'Production season not found'
            });
        }
        
        // Validate dates if provided
        if (start_date || end_date) {
            const startDate = new Date(start_date || existingSeason.start_date);
            const endDate = new Date(end_date || existingSeason.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format. Use YYYY-MM-DD format'
                });
            }
            
            if (startDate >= endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Start date must be before end date'
                });
            }
        }
        
        await database.run(
            `UPDATE production_seasons 
             SET season_name = COALESCE(?, season_name),
                 start_date = COALESCE(?, start_date),
                 end_date = COALESCE(?, end_date),
                 expected_yield = COALESCE(?, expected_yield),
                 actual_yield = COALESCE(?, actual_yield),
                 weather_conditions = COALESCE(?, weather_conditions),
                 notes = COALESCE(?, notes),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [
                season_name,
                start_date,
                end_date,
                expected_yield,
                actual_yield,
                weather_conditions,
                notes,
                id
            ]
        );
        
        const updatedSeason = await database.get('SELECT * FROM production_seasons WHERE id = ?', [id]);
        
        res.json({
            success: true,
            data: updatedSeason,
            message: 'Production season updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating production season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update production season',
            message: error.message
        });
    }
});

// DELETE /api/production-seasons/:id - Delete production season
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if season exists
        const existingSeason = await database.get('SELECT * FROM production_seasons WHERE id = ?', [id]);
        if (!existingSeason) {
            return res.status(404).json({
                success: false,
                error: 'Production season not found'
            });
        }
        
        // Check for dependencies
        const riceBatches = await database.get(
            'SELECT COUNT(*) as count FROM rice_batches WHERE production_season_id = ?',
            [id]
        );
        
        if (riceBatches.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete production season with existing rice batches'
            });
        }
        
        await database.run('DELETE FROM production_seasons WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Production season deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting production season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete production season',
            message: error.message
        });
    }
});

// GET /api/production-seasons/current - Get current active season
router.get('/current/active', async (req, res) => {
    try {
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const currentSeason = await database.get(
            `SELECT * FROM production_seasons 
             WHERE start_date <= ? AND end_date >= ?
             ORDER BY start_date DESC
             LIMIT 1`,
            [currentDate, currentDate]
        );
        
        if (!currentSeason) {
            return res.status(404).json({
                success: false,
                error: 'No active production season found'
            });
        }
        
        res.json({
            success: true,
            data: currentSeason
        });
    } catch (error) {
        console.error('Error fetching current season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current season',
            message: error.message
        });
    }
});

module.exports = router;