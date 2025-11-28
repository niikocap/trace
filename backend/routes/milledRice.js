const express = require('express');
const router = express.Router();
const externalApi = require('../services/externalApiClient');

function forwardSuccess(res, payload) {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return res.json(payload);
    }

    return res.json({ success: true, data: payload });
}

function handleExternalApiError(res, error, fallbackMessage) {
    const status = error.status || error.response?.status || 500;
    const message = error.message || fallbackMessage;
    const data = error.data || error.response?.data;

    if (data && typeof data === 'object') {
        return res.status(status).json({
            success: false,
            message: data.message || message,
            error: data.error || message,
            data: data.data || null
        });
    }

    return res.status(status).json({
        success: false,
        message
    });
}

// Mock milled rice data - blockchain-only system
const mockMilledRice = [
    { id: 1, batch_id: 1, batch_number: 'BATCH-001', miller_id: 3, miller_name: 'Miller Bob', milling_date: '2025-08-25', quantity_milled_kg: 950, quality_score: 88 },
    { id: 2, batch_id: 2, batch_number: 'BATCH-002', miller_id: 3, miller_name: 'Miller Bob', milling_date: '2025-08-30', quantity_milled_kg: 1425, quality_score: 92 }
];

// GET /api/milled-rice - Get all milled rice records
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: mockMilledRice,
            count: mockMilledRice.length
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
        const { data: milledRice, error } = await database.supabase
            .from('milled_rice')
            .select(`
                *,
                miller:chain_actors!miller_id(name),
                rice_batch:rice_batches!batch_id(batch_number)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Milled rice record not found'
                });
            }
            throw error;
        }

        // Transform the data to match expected format
        const transformedData = {
            ...milledRice,
            miller_name: milledRice.miller?.name || null,
            batch_number: milledRice.rice_batch?.batch_number || null
        };
        
        res.json({
            success: true,
            data: transformedData
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

// POST /api/milled-rice - Create milled rice record (upsert without id)
router.post('/', async (req, res) => {
    try {
        const data = await externalApi.post('/mobile/trace/milling/upsert', req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error creating milled rice record:', error);
        handleExternalApiError(res, error, 'Failed to create milled rice record');
    }
});

// POST /api/milled-rice/:id - Upsert milled rice record (update with id)
router.post('/:id', async (req, res) => {
    try {
        const data = await externalApi.post(`/mobile/trace/milling/upsert/${req.params.id}`, req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error updating milled rice record:', error);
        handleExternalApiError(res, error, 'Failed to update milled rice record');
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
            input_quantity,
            output_quantity,
            quality,
            machine,
            milling_yield_percentage,
            quality_parameters,
            storage_location
        } = req.body;
        
        // Check if record exists
        const { data: existingRecord, error: checkError } = await database.supabase
            .from('milled_rice')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        // Validate foreign key constraints if provided
        if (batch_id) {
            const { data: batch } = await database.supabase
                .from('rice_batches')
                .select('id')
                .eq('id', batch_id)
                .single();
                
            if (!batch) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid batch_id: rice batch not found'
                });
            }
        }
        
        if (miller_id) {
            const { data: miller } = await database.supabase
                .from('chain_actors')
                .select('id')
                .eq('id', miller_id)
                .eq('type', 'miller')
                .single();
                
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
        
        // Validate quantities if provided
        if (input_quantity !== undefined) {
            const inputQty = parseFloat(input_quantity);
            if (isNaN(inputQty) || inputQty <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'input_quantity must be a positive number'
                });
            }
        }
        if (output_quantity !== undefined) {
            const outputQty = parseFloat(output_quantity);
            if (isNaN(outputQty) || outputQty <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'output_quantity must be a positive number'
                });
            }
        }
        
        const updateData = {};
        if (batch_id !== undefined) updateData.batch_id = batch_id;
        if (rice_variety !== undefined) updateData.rice_variety = rice_variety;
        if (grade !== undefined) updateData.grade = grade;
        if (milling_date !== undefined) updateData.milling_date = milling_date;
        if (miller_id !== undefined) updateData.miller_id = miller_id;
        if (input_quantity !== undefined) updateData.input_quantity = input_quantity;
        if (output_quantity !== undefined) updateData.output_quantity = output_quantity;
        if (quality !== undefined) updateData.quality = quality;
        if (machine !== undefined) updateData.machine = machine;
        if (milling_yield_percentage !== undefined) updateData.milling_yield_percentage = milling_yield_percentage;
        if (storage_location !== undefined) updateData.storage_location = storage_location;

        const { error: updateError } = await database.supabase
            .from('milled_rice')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }
        
        const { data: updatedRecord, error: fetchError } = await database.supabase
            .from('milled_rice')
            .select(`
                *,
                miller:chain_actors!miller_id(name),
                rice_batch:rice_batches!batch_id(batch_number)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Transform the data to match expected format
        const transformedData = {
            ...updatedRecord,
            miller_name: updatedRecord.miller?.name || null,
            batch_number: updatedRecord.rice_batch?.batch_number || null
        };
        
        res.json({
            success: true,
            data: transformedData,
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
        const { data: existingRecord, error: checkError } = await database.supabase
            .from('milled_rice')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        // Validate foreign key constraints if provided
        if (batch_id) {
            const { data: batch } = await database.supabase
                .from('rice_batches')
                .select('id')
                .eq('id', batch_id)
                .single();
                
            if (!batch) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid batch_id: rice batch not found'
                });
            }
        }
        
        if (miller_id) {
            const { data: miller } = await database.supabase
                .from('chain_actors')
                .select('id')
                .eq('id', miller_id)
                .eq('type', 'miller')
                .single();
                
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
                    error: 'input_quantity must be a positive number'
                });
            }
        }
        if (output_quantity !== undefined) {
            const outputQty = parseFloat(output_quantity);
            if (isNaN(outputQty) || outputQty <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'output_quantity must be a positive number'
                });
            }
        }
        
        const updateData = {};
        if (batch_id !== undefined) updateData.batch_id = batch_id;
        if (rice_variety !== undefined) updateData.rice_variety = rice_variety;
        if (grade !== undefined) updateData.grade = grade;
        if (milling_date !== undefined) updateData.milling_date = milling_date;
        if (miller_id !== undefined) updateData.miller_id = miller_id;
        if (input_quantity !== undefined) updateData.input_quantity = input_quantity;
        if (output_quantity !== undefined) updateData.output_quantity = output_quantity;
        if (quality !== undefined) updateData.quality = quality;
        if (machine !== undefined) updateData.machine = machine;
        if (milling_yield_percentage !== undefined) updateData.milling_yield_percentage = milling_yield_percentage;
        if (storage_location !== undefined) updateData.storage_location = storage_location;

        const { error: updateError } = await database.supabase
            .from('milled_rice')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }
        
        const { data: updatedRecord, error: fetchError } = await database.supabase
            .from('milled_rice')
            .select(`
                *,
                miller:chain_actors!miller_id(name),
                rice_batch:rice_batches!batch_id(batch_number)
            `)
            .eq('id', id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Transform the data to match expected format
        const transformedData = {
            ...updatedRecord,
            miller_name: updatedRecord.miller?.name || null,
            batch_number: updatedRecord.rice_batch?.batch_number || null
        };
        
        res.json({
            success: true,
            data: transformedData,
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
        const { data: existingRecord, error: checkError } = await database.supabase
            .from('milled_rice')
            .select('*')
            .eq('id', id)
            .single();
            
        if (checkError || !existingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Milled rice record not found'
            });
        }
        
        const { error: deleteError } = await database.supabase
            .from('milled_rice')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }
        
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
        
        const { data: milledRice, error } = await database.supabase
            .from('milled_rice')
            .select(`
                *,
                miller:chain_actors!miller_id(name),
                rice_batch:rice_batches!batch_id(batch_number)
            `)
            .eq('batch_id', batchId)
            .order('milling_date', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        // Transform the data to match expected format
        const transformedData = milledRice?.map(rice => ({
            ...rice,
            miller_name: rice.miller?.name || null,
            batch_number: rice.rice_batch?.batch_number || null
        })) || [];
        
        res.json({
            success: true,
            data: transformedData,
            count: transformedData.length
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