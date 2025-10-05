const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Initialize database connection
database.connect();

// GET /api/production-seasons - Get all production seasons
router.get('/', async (req, res) => {
    try {
        const { data: seasons, error } = await database.supabase
            .from('production_seasons')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: seasons || [],
            count: seasons?.length || 0
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
        const { data: season, error } = await database.supabase
            .from('production_seasons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Production season not found'
                });
            }
            throw error;
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
            planting_date,
            harvesting_date,
            variety,
            carbon_certified,
            fertilizer_used,
            pesticide_used,
            farmer_id
        } = req.body;
        
        // Validate required fields
        if (!season_name || !planting_date || !harvesting_date) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: season_name, planting_date, harvesting_date'
            });
        }
        
        // Validate date format and logic
        const plantingDate = new Date(planting_date);
        const harvestingDate = new Date(harvesting_date);
        
        if (isNaN(plantingDate.getTime()) || isNaN(harvestingDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD format'
            });
        }
        
        if (plantingDate >= harvestingDate) {
            return res.status(400).json({
                success: false,
                error: 'Planting date must be before harvesting date'
            });
        }
        
        const { data: newSeason, error: insertError } = await database.supabase
            .from('production_seasons')
            .insert({
                season_name,
                start_date: planting_date,
                end_date: harvesting_date,
                variety: variety || null,
                carbon_certified: carbon_certified || false,
                fertilizer_used: Array.isArray(fertilizer_used) ? fertilizer_used.join(',') : fertilizer_used || null,
                pesticide_used: Array.isArray(pesticide_used) ? pesticide_used.join(',') : pesticide_used || null,
                farmer_id: farmer_id || null
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }
        
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
        const { data: existingSeason, error: checkError } = await database.supabase
            .from('production_seasons')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingSeason) {
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
        
        const updateData = {};
        if (season_name !== undefined) updateData.season_name = season_name;
        if (start_date !== undefined) updateData.start_date = start_date;
        if (end_date !== undefined) updateData.end_date = end_date;
        if (expected_yield !== undefined) updateData.expected_yield = expected_yield;
        if (actual_yield !== undefined) updateData.actual_yield = actual_yield;
        if (weather_conditions !== undefined) updateData.weather_conditions = weather_conditions;
        if (notes !== undefined) updateData.notes = notes;

        const { error: updateError } = await database.supabase
            .from('production_seasons')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }
        
        const { data: updatedSeason, error: fetchError } = await database.supabase
            .from('production_seasons')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }
        
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
        const { data: existingSeason, error: checkError } = await database.supabase
            .from('production_seasons')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingSeason) {
            return res.status(404).json({
                success: false,
                error: 'Production season not found'
            });
        }
        
        // Check for dependencies
        const { data: riceBatches, error: batchError } = await database.supabase
            .from('rice_batches')
            .select('id')
            .eq('production_season_id', id);
        
        if (batchError) {
            throw batchError;
        }
        
        if (riceBatches && riceBatches.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete production season with existing rice batches'
            });
        }
        
        const { error: deleteError } = await database.supabase
            .from('production_seasons')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }
        
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
        
        const { data: currentSeasons, error } = await database.supabase
            .from('production_seasons')
            .select('*')
            .lte('start_date', currentDate)
            .gte('end_date', currentDate)
            .order('start_date', { ascending: false })
            .limit(1);
            
        if (error) {
            throw error;
        }
        
        const currentSeason = currentSeasons && currentSeasons.length > 0 ? currentSeasons[0] : null;
        
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