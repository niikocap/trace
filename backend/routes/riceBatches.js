const express = require('express');
const router = express.Router();

// Mock rice batches data - blockchain-only system
const mockBatches = [
    { id: 1, batch_number: 'BATCH-001', farmer_id: 1, farmer_name: 'Farmer John', production_season_id: 1, season_name: 'Summer 2025', harvest_date: '2025-08-15', quantity_kg: 1000, quality_score: 85 },
    { id: 2, batch_number: 'BATCH-002', farmer_id: 2, farmer_name: 'Farmer Maria', production_season_id: 1, season_name: 'Summer 2025', harvest_date: '2025-08-20', quantity_kg: 1500, quality_score: 90 }
];

// GET /api/rice-batches - Get all rice batches
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: mockBatches,
            count: mockBatches.length
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
        const { data: riceBatch, error } = await database.supabase
            .from('rice_batches')
            .select(`
                *,
                farmer:chain_actors!farmer_id(name),
                production_season:production_seasons!production_season_id(season_name)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Rice batch not found'
                });
            }
            throw error;
        }
        
        // Transform the data to match expected format
        const transformedData = {
            ...riceBatch,
            farmer_name: riceBatch.farmer?.name || null,
            season_name: riceBatch.production_season?.season_name || null
        };
        
        res.json({
            success: true,
            data: transformedData
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
            milling_id,
            validator_id,
            dryer,
            planting_date,
            harvest_date,
            quantity_harvested,
            quality_grade,
            farming_practices,
            certifications,
            storage_conditions
        } = req.body;
        
        // Generate auto UUID for batch_id and QR code
        const batch_id = uuidv4();
        const qr_code = batch_id; // Use UUID as QR code identifier
        
        // Auto-generate batch_number if not provided
        const finalBatchNumber = batch_number || `BATCH-${Date.now()}`;
        
        // Validate required fields
        if (!farmer_id || !production_season_id || !rice_variety) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: farmer_id, production_season_id, rice_variety'
            });
        }
        
        // Check for unique batch number
        const { data: existingBatch } = await database.supabase
            .from('rice_batches')
            .select('id')
            .eq('batch_number', finalBatchNumber)
            .single();
            
        if (existingBatch) {
            return res.status(400).json({
                success: false,
                error: 'Batch number already exists'
            });
        }
        
        // Validate foreign key constraints
        const { data: farmer } = await database.supabase
            .from('chain_actors')
            .select('id')
            .eq('id', farmer_id)
            .eq('type', 'farmer')
            .single();
            
        if (!farmer) {
            return res.status(400).json({
                success: false,
                error: 'Invalid farmer_id: farmer not found or not of type "farmer"'
            });
        }
        
        const { data: season } = await database.supabase
            .from('production_seasons')
            .select('id')
            .eq('id', production_season_id)
            .single();
            
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
        
        const { data: newRiceBatch, error: insertError } = await database.supabase
            .from('rice_batches')
            .insert({
                batch_id,
                batch_number: finalBatchNumber,
                farmer_id,
                production_season_id,
                rice_variety,
                milling_id: milling_id || null,
                validator_id: validator_id || null,
                dryer: dryer || null,
                planting_date: planting_date || null,
                harvest_date: harvest_date || null,
                quantity_harvested: quantity_harvested || null,
                quality_grade: quality_grade || null,
                farming_practices: farming_practices || null,
                certifications: certifications || null,
                storage_conditions: storage_conditions || null
            })
            .select(`
                *,
                farmer:chain_actors!farmer_id(name),
                production_season:production_seasons!production_season_id(season_name)
            `)
            .single();

        if (insertError) {
            throw insertError;
        }

        // Transform the data to match expected format
        const transformedData = {
            ...newRiceBatch,
            farmer_name: newRiceBatch.farmer?.name || null,
            season_name: newRiceBatch.production_season?.season_name || null
        };
        
        res.status(201).json({
            success: true,
            data: transformedData,
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
        const { data: existingBatch, error: checkError } = await database.supabase
            .from('rice_batches')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingBatch) {
            return res.status(404).json({
                success: false,
                error: 'Rice batch not found'
            });
        }
        
        // Check for unique batch number if provided
        if (batch_number && batch_number !== existingBatch.batch_number) {
            const { data: duplicateBatch } = await database.supabase
                .from('rice_batches')
                .select('id')
                .eq('batch_number', batch_number)
                .neq('id', id)
                .single();
                
            if (duplicateBatch) {
                return res.status(400).json({
                    success: false,
                    error: 'Batch number already exists'
                });
            }
        }
        
        // Validate foreign key constraints if provided
        if (farmer_id) {
            const { data: farmer } = await database.supabase
                .from('chain_actors')
                .select('id')
                .eq('id', farmer_id)
                .eq('type', 'farmer')
                .single();
                
            if (!farmer) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid farmer_id: farmer not found or not of type "farmer"'
                });
            }
        }
        
        if (production_season_id) {
            const { data: season } = await database.supabase
                .from('production_seasons')
                .select('id')
                .eq('id', production_season_id)
                .single();
                
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
        
        const updateData = {};
        if (batch_number !== undefined) updateData.batch_number = batch_number;
        if (farmer_id !== undefined) updateData.farmer_id = farmer_id;
        if (production_season_id !== undefined) updateData.production_season_id = production_season_id;
        if (rice_variety !== undefined) updateData.rice_variety = rice_variety;
        if (planting_date !== undefined) updateData.planting_date = planting_date;
        if (harvest_date !== undefined) updateData.harvest_date = harvest_date;
        if (quantity_harvested !== undefined) updateData.quantity_harvested = quantity_harvested;
        if (quality_grade !== undefined) updateData.quality_grade = quality_grade;
        if (farming_practices !== undefined) updateData.farming_practices = farming_practices;
        if (certifications !== undefined) updateData.certifications = certifications;
        if (storage_conditions !== undefined) updateData.storage_conditions = storage_conditions;

        const { error: updateError } = await database.supabase
            .from('rice_batches')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }
        
        const { data: updatedBatch, error: fetchError } = await database.supabase
            .from('rice_batches')
            .select(`
                *,
                farmer:chain_actors!farmer_id(name),
                production_season:production_seasons!production_season_id(season_name)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Transform the data to match expected format
        const transformedData = {
            ...updatedBatch,
            farmer_name: updatedBatch.farmer?.name || null,
            season_name: updatedBatch.production_season?.season_name || null
        };
        
        res.json({
            success: true,
            data: transformedData,
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
        const { data: existingBatch, error: checkError } = await database.supabase
            .from('rice_batches')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingBatch) {
            return res.status(404).json({
                success: false,
                error: 'Rice batch not found'
            });
        }
        
        // Check for dependencies
        const { data: milledRice, error: milledError } = await database.supabase
            .from('milled_rice')
            .select('id')
            .eq('batch_id', id);
            
        if (milledError) {
            throw milledError;
        }
        
        if (milledRice && milledRice.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete rice batch with existing milled rice records'
            });
        }
        
        const { error: deleteError } = await database.supabase
            .from('rice_batches')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }
        
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
        
        const { data: riceBatches, error } = await database.supabase
            .from('rice_batches')
            .select(`
                *,
                farmer:chain_actors!farmer_id(name),
                production_season:production_seasons!production_season_id(season_name)
            `)
            .eq('farmer_id', farmerId)
            .order('harvest_date', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        // Transform the data to match expected format
        const transformedData = riceBatches?.map(batch => ({
            ...batch,
            farmer_name: batch.farmer?.name || null,
            season_name: batch.production_season?.season_name || null
        })) || [];
        
        res.json({
            success: true,
            data: transformedData,
            count: transformedData.length
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
        
        const { data: riceBatches, error } = await database.supabase
            .from('rice_batches')
            .select(`
                *,
                farmer:chain_actors!farmer_id(name),
                production_season:production_seasons!production_season_id(season_name)
            `)
            .eq('production_season_id', seasonId)
            .order('harvest_date', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        // Transform the data to match expected format
        const transformedData = riceBatches?.map(batch => ({
            ...batch,
            farmer_name: batch.farmer?.name || null,
            season_name: batch.production_season?.season_name || null
        })) || [];
        
        res.json({
            success: true,
            data: transformedData,
            count: transformedData.length
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