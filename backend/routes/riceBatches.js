const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/rice-batches - Get all rice batches
router.get('/', async (req, res) => {
    try {
        const riceBatches = await database.all(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            ORDER BY rb.harvest_date DESC
        `);
        
        res.json({
            success: true,
            data: riceBatches,
            count: riceBatches.length
        });
    } catch (error) {
        console.error('Error fetching rice batches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rice batches',
            message: error.message
        });
    }
});

// GET /api/rice-batches/:id - Get rice batch by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const riceBatch = await database.get(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            WHERE rb.id = ?
        `, [id]);
        
        if (!riceBatch) {
            return res.status(404).json({
                success: false,
                error: 'Rice batch not found'
            });
        }
        
        res.json({
            success: true,
            data: riceBatch
        });
    } catch (error) {
        console.error('Error fetching rice batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rice batch',
            message: error.message
        });
    }
});

// POST /api/rice-batches - Create rice batch
router.post('/', async (req, res) => {
    try {
        const {
            batch_number,
            farmer_id,
            production_season_id,
            rice_variety,
            planting_date,
            harvest_date,
            quantity_harvested,
            quality_grade,
            farming_practices,
            certifications,
            storage_conditions
        } = req.body;
        
        // Validate required fields
        if (!batch_number || !farmer_id || !production_season_id || !rice_variety) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: batch_number, farmer_id, production_season_id, rice_variety'
            });
        }
        
        // Check for unique batch number
        const existingBatch = await database.get('SELECT * FROM rice_batches WHERE batch_number = ?', [batch_number]);
        if (existingBatch) {
            return res.status(400).json({
                success: false,
                error: 'Batch number already exists'
            });
        }
        
        // Validate foreign key constraints
        const farmer = await database.get('SELECT * FROM chain_actors WHERE id = ? AND type = "farmer"', [farmer_id]);
        if (!farmer) {
            return res.status(400).json({
                success: false,
                error: 'Invalid farmer_id: farmer not found or not of type "farmer"'
            });
        }
        
        const season = await database.get('SELECT * FROM production_seasons WHERE id = ?', [production_season_id]);
        if (!season) {
            return res.status(400).json({
                success: false,
                error: 'Invalid production_season_id: production season not found'
            });
        }
        
        // Validate dates if provided
        if (planting_date) {
            const plantingDate = new Date(planting_date);
            if (isNaN(plantingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid planting_date format. Use YYYY-MM-DD format'
                });
            }
        }
        
        if (harvest_date) {
            const harvestDate = new Date(harvest_date);
            if (isNaN(harvestDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid harvest_date format. Use YYYY-MM-DD format'
                });
            }
            
            // Check if harvest date is after planting date
            if (planting_date && new Date(planting_date) >= new Date(harvest_date)) {
                return res.status(400).json({
                    success: false,
                    error: 'Harvest date must be after planting date'
                });
            }
        }
        
        // Validate quantity if provided
        if (quantity_harvested !== undefined) {
            const quantity = parseFloat(quantity_harvested);
            if (isNaN(quantity) || quantity < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'quantity_harvested must be a non-negative number'
                });
            }
        }
        
        const result = await database.run(
            `INSERT INTO rice_batches (
                batch_number, farmer_id, production_season_id, rice_variety,
                planting_date, harvest_date, quantity_harvested, quality_grade,
                farming_practices, certifications, storage_conditions,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                batch_number,
                farmer_id,
                production_season_id,
                rice_variety,
                planting_date || null,
                harvest_date || null,
                quantity_harvested || null,
                quality_grade || null,
                farming_practices || null,
                certifications || null,
                storage_conditions || null
            ]
        );
        
        const newRiceBatch = await database.get(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            WHERE rb.id = ?
        `, [result.id]);
        
        res.status(201).json({
            success: true,
            data: newRiceBatch,
            message: 'Rice batch created successfully'
        });
        
    } catch (error) {
        console.error('Error creating rice batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create rice batch',
            message: error.message
        });
    }
});

// PUT /api/rice-batches/:id - Update rice batch
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            batch_number,
            farmer_id,
            production_season_id,
            rice_variety,
            planting_date,
            harvest_date,
            quantity_harvested,
            quality_grade,
            farming_practices,
            certifications,
            storage_conditions
        } = req.body;
        
        // Check if record exists
        const existingBatch = await database.get('SELECT * FROM rice_batches WHERE id = ?', [id]);
        if (!existingBatch) {
            return res.status(404).json({
                success: false,
                error: 'Rice batch not found'
            });
        }
        
        // Check for unique batch number if provided
        if (batch_number && batch_number !== existingBatch.batch_number) {
            const duplicateBatch = await database.get('SELECT * FROM rice_batches WHERE batch_number = ? AND id != ?', [batch_number, id]);
            if (duplicateBatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Batch number already exists'
                });
            }
        }
        
        // Validate foreign key constraints if provided
        if (farmer_id) {
            const farmer = await database.get('SELECT * FROM chain_actors WHERE id = ? AND type = "farmer"', [farmer_id]);
            if (!farmer) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid farmer_id: farmer not found or not of type "farmer"'
                });
            }
        }
        
        if (production_season_id) {
            const season = await database.get('SELECT * FROM production_seasons WHERE id = ?', [production_season_id]);
            if (!season) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid production_season_id: production season not found'
                });
            }
        }
        
        // Validate dates if provided
        if (planting_date) {
            const plantingDate = new Date(planting_date);
            if (isNaN(plantingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid planting_date format. Use YYYY-MM-DD format'
                });
            }
        }
        
        if (harvest_date) {
            const harvestDate = new Date(harvest_date);
            if (isNaN(harvestDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid harvest_date format. Use YYYY-MM-DD format'
                });
            }
            
            // Check if harvest date is after planting date
            const finalPlantingDate = planting_date || existingBatch.planting_date;
            if (finalPlantingDate && new Date(finalPlantingDate) >= new Date(harvest_date)) {
                return res.status(400).json({
                    success: false,
                    error: 'Harvest date must be after planting date'
                });
            }
        }
        
        // Validate quantity if provided
        if (quantity_harvested !== undefined) {
            const quantity = parseFloat(quantity_harvested);
            if (isNaN(quantity) || quantity < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'quantity_harvested must be a non-negative number'
                });
            }
        }
        
        await database.run(
            `UPDATE rice_batches 
             SET batch_number = COALESCE(?, batch_number),
                 farmer_id = COALESCE(?, farmer_id),
                 production_season_id = COALESCE(?, production_season_id),
                 rice_variety = COALESCE(?, rice_variety),
                 planting_date = COALESCE(?, planting_date),
                 harvest_date = COALESCE(?, harvest_date),
                 quantity_harvested = COALESCE(?, quantity_harvested),
                 quality_grade = COALESCE(?, quality_grade),
                 farming_practices = COALESCE(?, farming_practices),
                 certifications = COALESCE(?, certifications),
                 storage_conditions = COALESCE(?, storage_conditions),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [
                batch_number,
                farmer_id,
                production_season_id,
                rice_variety,
                planting_date,
                harvest_date,
                quantity_harvested,
                quality_grade,
                farming_practices,
                certifications,
                storage_conditions,
                id
            ]
        );
        
        const updatedBatch = await database.get(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            WHERE rb.id = ?
        `, [id]);
        
        res.json({
            success: true,
            data: updatedBatch,
            message: 'Rice batch updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating rice batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update rice batch',
            message: error.message
        });
    }
});

// DELETE /api/rice-batches/:id - Delete rice batch
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if record exists
        const existingBatch = await database.get('SELECT * FROM rice_batches WHERE id = ?', [id]);
        if (!existingBatch) {
            return res.status(404).json({
                success: false,
                error: 'Rice batch not found'
            });
        }
        
        // Check for dependencies
        const milledRice = await database.get('SELECT COUNT(*) as count FROM milled_rice WHERE batch_id = ?', [id]);
        if (milledRice.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete rice batch with existing milled rice records'
            });
        }
        
        await database.run('DELETE FROM rice_batches WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Rice batch deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting rice batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete rice batch',
            message: error.message
        });
    }
});

// GET /api/rice-batches/farmer/:farmerId - Get rice batches by farmer ID
router.get('/farmer/:farmerId', async (req, res) => {
    try {
        const { farmerId } = req.params;
        
        const riceBatches = await database.all(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            WHERE rb.farmer_id = ?
            ORDER BY rb.harvest_date DESC
        `, [farmerId]);
        
        res.json({
            success: true,
            data: riceBatches,
            count: riceBatches.length
        });
    } catch (error) {
        console.error('Error fetching rice batches by farmer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rice batches by farmer',
            message: error.message
        });
    }
});

// GET /api/rice-batches/season/:seasonId - Get rice batches by season ID
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        
        const riceBatches = await database.all(`
            SELECT rb.*, ca.name as farmer_name, ps.season_name
            FROM rice_batches rb
            LEFT JOIN chain_actors ca ON rb.farmer_id = ca.id
            LEFT JOIN production_seasons ps ON rb.production_season_id = ps.id
            WHERE rb.production_season_id = ?
            ORDER BY rb.harvest_date DESC
        `, [seasonId]);
        
        res.json({
            success: true,
            data: riceBatches,
            count: riceBatches.length
        });
    } catch (error) {
        console.error('Error fetching rice batches by season:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rice batches by season',
            message: error.message
        });
    }
});

module.exports = router;