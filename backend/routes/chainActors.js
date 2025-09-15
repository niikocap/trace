const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/chain-actors - Get all chain actors
router.get('/', async (req, res) => {
    try {
        const actors = await database.all('chain_actors', {}, { column: 'created_at', ascending: false });
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
        const actor = await database.get('chain_actors', { id });
        
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
        const { name, type, location, group, farmer_id, assign_tps } = req.body;
        
        // Validate required fields
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, type'
            });
        }
        
        // Validate type enum (can be array or string)
        const validTypes = ['farmer', 'miller', 'distributor', 'retailer', 'validator'];
        let typeToStore = type;
        
        if (Array.isArray(type)) {
            // Check if all types in array are valid
            const invalidTypes = type.filter(t => !validTypes.includes(t));
            if (invalidTypes.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid type(s): ${invalidTypes.join(', ')}. Must be one of: farmer, miller, distributor, retailer, validator`
                });
            }
            typeToStore = type.join(',');
        } else {
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid type. Must be one of: farmer, miller, distributor, retailer, validator'
                });
            }
        }
        
        const result = await database.insert('chain_actors', {
            name,
            type: typeToStore,
            location: location || null,
            group: group || null,
            farmer_id: farmer_id || null,
            assign_tps: assign_tps || null
        });
        
        const newActor = await database.get('chain_actors', { id: result.id });
        
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
        let typeToStore = type;
        if (type) {
            const validTypes = ['farmer', 'miller', 'distributor', 'retailer', 'validator'];
            
            if (Array.isArray(type)) {
                const invalidTypes = type.filter(t => !validTypes.includes(t));
                if (invalidTypes.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid type(s): ${invalidTypes.join(', ')}. Must be one of: farmer, miller, distributor, retailer, validator`
                    });
                }
                typeToStore = type.join(',');
            } else {
                if (!validTypes.includes(type)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid type. Must be one of: farmer, miller, distributor, retailer, validator'
                    });
                }
            }
        }
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (typeToStore !== undefined) updateData.type = typeToStore;
        if (location !== undefined) updateData.location = location;
        if (group !== undefined) updateData.group = group;
        if (farmer_id !== undefined) updateData.farmer_id = farmer_id;
        if (assign_tps !== undefined) updateData.assign_tps = assign_tps;
        
        await database.update('chain_actors', id, updateData);
        
        const updatedActor = await database.get('chain_actors', { id });
        
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
        const existingActor = await database.get('chain_actors', { id });
        if (!existingActor) {
            return res.status(404).json({
                success: false,
                error: 'Chain actor not found'
            });
        }
        
        // Check for dependencies
        const riceBatches = await database.all('rice_batches', { farmer_id: id });
        const milledRice = await database.all('milled_rice', { miller_id: id });
        
        if (riceBatches.length > 0 || milledRice.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete chain actor with existing dependencies (rice batches or milled rice records)'
            });
        }
        
        await database.delete('chain_actors', id);
        
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
        
        const actors = await database.all('chain_actors', { type }, { column: 'created_at', ascending: false });
        
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