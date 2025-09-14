const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/chain-actors - Get all chain actors
router.get('/', async (req, res) => {
    try {
        const actors = await database.all('SELECT * FROM chain_actors ORDER BY created_at DESC');
        res.json({
            success: true,
            data: actors,
            count: actors.length
        });
    } catch (error) {
        console.error('Error fetching chain actors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain actors',
            message: error.message
        });
    }
});

// GET /api/chain-actors/:id - Get chain actor by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const actor = await database.get('SELECT * FROM chain_actors WHERE id = ?', [id]);
        
        if (!actor) {
            return res.status(404).json({
                success: false,
                error: 'Chain actor not found'
            });
        }
        
        res.json({
            success: true,
            data: actor
        });
    } catch (error) {
        console.error('Error fetching chain actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain actor',
            message: error.message
        });
    }
});

// POST /api/chain-actors - Create chain actor
router.post('/', async (req, res) => {
    try {
        const { name, type, contact_info, location, certification_details } = req.body;
        
        // Validate required fields
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, type'
            });
        }
        
        // Validate type enum
        const validTypes = ['farmer', 'miller', 'distributor', 'retailer'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid type. Must be one of: farmer, miller, distributor, retailer'
            });
        }
        
        const result = await database.run(
            `INSERT INTO chain_actors (name, type, contact_info, location, certification_details, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [name, type, contact_info || null, location || null, certification_details || null]
        );
        
        const newActor = await database.get('SELECT * FROM chain_actors WHERE id = ?', [result.id]);
        
        res.status(201).json({
            success: true,
            data: newActor,
            message: 'Chain actor created successfully'
        });
        
    } catch (error) {
        console.error('Error creating chain actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create chain actor',
            message: error.message
        });
    }
});

// PUT /api/chain-actors/:id - Update chain actor
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, contact_info, location, certification_details } = req.body;
        
        // Check if actor exists
        const existingActor = await database.get('SELECT * FROM chain_actors WHERE id = ?', [id]);
        if (!existingActor) {
            return res.status(404).json({
                success: false,
                error: 'Chain actor not found'
            });
        }
        
        // Validate type enum if provided
        if (type) {
            const validTypes = ['farmer', 'miller', 'distributor', 'retailer'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid type. Must be one of: farmer, miller, distributor, retailer'
                });
            }
        }
        
        await database.run(
            `UPDATE chain_actors 
             SET name = COALESCE(?, name),
                 type = COALESCE(?, type),
                 contact_info = COALESCE(?, contact_info),
                 location = COALESCE(?, location),
                 certification_details = COALESCE(?, certification_details),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [name, type, contact_info, location, certification_details, id]
        );
        
        const updatedActor = await database.get('SELECT * FROM chain_actors WHERE id = ?', [id]);
        
        res.json({
            success: true,
            data: updatedActor,
            message: 'Chain actor updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating chain actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update chain actor',
            message: error.message
        });
    }
});

// DELETE /api/chain-actors/:id - Delete chain actor
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if actor exists
        const existingActor = await database.get('SELECT * FROM chain_actors WHERE id = ?', [id]);
        if (!existingActor) {
            return res.status(404).json({
                success: false,
                error: 'Chain actor not found'
            });
        }
        
        // Check for dependencies
        const riceBatches = await database.get('SELECT COUNT(*) as count FROM rice_batches WHERE farmer_id = ?', [id]);
        const milledRice = await database.get('SELECT COUNT(*) as count FROM milled_rice WHERE miller_id = ?', [id]);
        
        if (riceBatches.count > 0 || milledRice.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete chain actor with existing dependencies (rice batches or milled rice records)'
            });
        }
        
        await database.run('DELETE FROM chain_actors WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Chain actor deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting chain actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete chain actor',
            message: error.message
        });
    }
});

// GET /api/chain-actors/type/:type - Get chain actors by type
router.get('/type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        const validTypes = ['farmer', 'miller', 'distributor', 'retailer'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid type. Must be one of: farmer, miller, distributor, retailer'
            });
        }
        
        const actors = await database.all(
            'SELECT * FROM chain_actors WHERE type = ? ORDER BY created_at DESC',
            [type]
        );
        
        res.json({
            success: true,
            data: actors,
            count: actors.length
        });
    } catch (error) {
        console.error('Error fetching chain actors by type:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain actors by type',
            message: error.message
        });
    }
});

module.exports = router;