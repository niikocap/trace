const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/milled-rice - Get all milled rice records
router.get('/', async (req, res) => {
    try {
        const { data: milledRice, error } = await database.supabase
            .from('milled_rice')
            .select(`
                *,
                rice_batch:rice_batches!batch_id(batch_number),
                miller:chain_actors!miller_id(name)
            `)
            .order('milling_date', { ascending: false });

        if (error) {
            throw error;
        }

        // Transform the data to match expected format
        const transformedData = milledRice?.map(rice => ({
            ...rice,
            batch_number: rice.rice_batch?.batch_number || null,
            miller_name: rice.miller?.name || null
        })) || [];
        
        res.json({
            success: true,
            data: transformedData,
            count: transformedData.length
        });
    } catch (error) {
        console.error('Error fetching milled rice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch milled rice records',
            message: error.message
        });
    }
});

// GET /api/milled-rice/:id - Get milled rice record by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const milledRice = await database.get(`
            SELECT mr.*, ca.name as miller_name, rb.batch_number
            FROM milled_rice mr
            LEFT JOIN chain_actors ca ON mr.miller_id = ca.id
            LEFT JOIN rice_batches rb ON mr.batch_id = rb.id
            WHERE mr.id = ?
        `, [id]);
        
        if (!milledRice) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        res.json({
            success: true,
            data: milledRice
        });
    } catch (error) {
        console.error('Error fetching milled rice record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch milled rice record',
            message: error.message
        });
    }
});

// POST /api/milled-rice - Create milled rice record
router.post('/', async (req, res) => {
    try {
        const {
            batch_id,
            rice_variety,
            grade,
            milling_date,
            miller_id,
            input_quantity,
            output_quantity,
            quality,
            machine,
            milling_yield_percentage,
            quality_parameters,
            storage_location
        } = req.body;
        
        // Validate required fields
        if (!batch_id || !rice_variety || !milling_date || !miller_id || !input_quantity || !output_quantity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: batch_id, rice_variety, milling_date, miller_id, input_quantity, output_quantity'
            });
        }
        
        // Validate foreign key constraints
        const batch = await database.get('SELECT * FROM rice_batches WHERE id = ?', [batch_id]);
        if (!batch) {
            return res.status(400).json({
                success: false,
                error: 'Invalid batch_id: rice batch not found'
            });
        }
        
        const miller = await database.get('SELECT * FROM chain_actors WHERE id = ? AND type = "miller"', [miller_id]);
        if (!miller) {
            return res.status(400).json({
                success: false,
                error: 'Invalid miller_id: miller not found or not of type "miller"'
            });
        }
        
        // Validate date format
        const millingDate = new Date(milling_date);
        if (isNaN(millingDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid milling_date format. Use YYYY-MM-DD format'
            });
        }
        
        // Validate quantities
        const inputQty = parseFloat(input_quantity);
        const outputQty = parseFloat(output_quantity);
        if (isNaN(inputQty) || inputQty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'input_quantity must be a positive number'
            });
        }
        if (isNaN(outputQty) || outputQty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'output_quantity must be a positive number'
            });
        }
        
        // Calculate milling yield percentage if not provided
        const yieldPercentage = milling_yield_percentage || ((outputQty / inputQty) * 100).toFixed(2);
        
        const result = await database.run(
            `INSERT INTO milled_rice (
                batch_id, rice_variety, grade, milling_date, miller_id,
                input_quantity, output_quantity, quality, machine,
                milling_yield_percentage, quality_parameters,
                storage_location, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                batch_id,
                rice_variety,
                grade || null,
                milling_date,
                miller_id,
                input_quantity,
                output_quantity,
                quality || null,
                machine || null,
                yieldPercentage,
                quality_parameters || null,
                storage_location || null
            ]
        );
        
        const newMilledRice = await database.get(`
            SELECT mr.*, ca.name as miller_name, rb.batch_number
            FROM milled_rice mr
            LEFT JOIN chain_actors ca ON mr.miller_id = ca.id
            LEFT JOIN rice_batches rb ON mr.batch_id = rb.id
            WHERE mr.id = ?
        `, [result.id]);
        
        res.status(201).json({
            success: true,
            data: newMilledRice,
            message: 'Milled rice record created successfully'
        });
        
    } catch (error) {
        console.error('Error creating milled rice record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create milled rice record',
            message: error.message
        });
    }
});

// PUT /api/milled-rice/:id - Update milled rice record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            batch_id,
            rice_variety,
            grade,
            milling_date,
            miller_id,
            quantity_milled,
            milling_yield_percentage,
            quality_parameters,
            storage_location
        } = req.body;
        
        // Check if record exists
        const existingRecord = await database.get('SELECT * FROM milled_rice WHERE id = ?', [id]);
        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        // Validate foreign key constraints if provided
        if (batch_id) {
            const batch = await database.get('SELECT * FROM rice_batches WHERE id = ?', [batch_id]);
            if (!batch) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid batch_id: rice batch not found'
                });
            }
        }
        
        if (miller_id) {
            const miller = await database.get('SELECT * FROM chain_actors WHERE id = ? AND type = "miller"', [miller_id]);
            if (!miller) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid miller_id: miller not found or not of type "miller"'
                });
            }
        }
        
        // Validate date format if provided
        if (milling_date) {
            const millingDate = new Date(milling_date);
            if (isNaN(millingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid milling_date format. Use YYYY-MM-DD format'
                });
            }
        }
        
        // Validate quantity if provided
        if (quantity_milled !== undefined) {
            const quantity = parseFloat(quantity_milled);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'quantity_milled must be a positive number'
                });
            }
        }
        
        await database.run(
            `UPDATE milled_rice 
             SET batch_id = COALESCE(?, batch_id),
                 rice_variety = COALESCE(?, rice_variety),
                 grade = COALESCE(?, grade),
                 milling_date = COALESCE(?, milling_date),
                 miller_id = COALESCE(?, miller_id),
                 quantity_milled = COALESCE(?, quantity_milled),
                 milling_yield_percentage = COALESCE(?, milling_yield_percentage),
                 quality_parameters = COALESCE(?, quality_parameters),
                 storage_location = COALESCE(?, storage_location),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [
                batch_id,
                rice_variety,
                grade,
                milling_date,
                miller_id,
                quantity_milled,
                milling_yield_percentage,
                quality_parameters,
                storage_location,
                id
            ]
        );
        
        const updatedRecord = await database.get(`
            SELECT mr.*, ca.name as miller_name, rb.batch_number
            FROM milled_rice mr
            LEFT JOIN chain_actors ca ON mr.miller_id = ca.id
            LEFT JOIN rice_batches rb ON mr.batch_id = rb.id
            WHERE mr.id = ?
        `, [id]);
        
        res.json({
            success: true,
            data: updatedRecord,
            message: 'Milled rice record updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating milled rice record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update milled rice record',
            message: error.message
        });
    }
});

// DELETE /api/milled-rice/:id - Delete milled rice record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if record exists
        const existingRecord = await database.get('SELECT * FROM milled_rice WHERE id = ?', [id]);
        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        await database.run('DELETE FROM milled_rice WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Milled rice record deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting milled rice record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete milled rice record',
            message: error.message
        });
    }
});

// GET /api/milled-rice/batch/:batchId - Get milled rice records by batch ID
router.get('/batch/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        
        const milledRice = await database.all(`
            SELECT mr.*, ca.name as miller_name, rb.batch_number
            FROM milled_rice mr
            LEFT JOIN chain_actors ca ON mr.miller_id = ca.id
            LEFT JOIN rice_batches rb ON mr.batch_id = rb.id
            WHERE mr.batch_id = ?
            ORDER BY mr.milling_date DESC
        `, [batchId]);
        
        res.json({
            success: true,
            data: milledRice,
            count: milledRice.length
        });
    } catch (error) {
        console.error('Error fetching milled rice by batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch milled rice records by batch',
            message: error.message
        });
    }
});

module.exports = router;