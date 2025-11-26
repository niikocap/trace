const express = require('express');
const router = express.Router();
const database = require('../config/database');

// Mock drying data - blockchain-only system
const mockDryingData = [
    { 
        id: 1, 
        initial_mc: "20.00", 
        final_mc: "15.00", 
        temperature: null, 
        airflow: null, 
        humidity: null, 
        duration: "20.00", 
        price: "0.00", 
        initial_weight: "200.00", 
        final_weight: "20.00",
        created_at: "2025-11-12T05:43:11.000000Z",
        updated_at: "2025-11-12T05:43:11.000000Z"
    }
];

// GET /api/drying-data - Get all drying data records
router.get('/', async (req, res) => {
    try {
        res.json({
            success: true,
            data: mockDryingData,
            count: mockDryingData.length
        });
    } catch (error) {
        console.error('Error fetching drying data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch drying data records',
            message: error.message
        });
    }
});

// GET /api/drying-data/:id - Get drying data record by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dryingRecord = mockDryingData.find(record => record.id == id);
        
        if (!dryingRecord) {
            return res.status(404).json({
                success: false,
                error: 'Drying data record not found'
            });
        }

        res.json({
            success: true,
            data: dryingRecord
        });
    } catch (error) {
        console.error('Error fetching drying data record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch drying data record',
            message: error.message
        });
    }
});

// POST /api/drying-data - Create drying data record
router.post('/', async (req, res) => {
    try {
        const {
            initial_mc,
            final_mc,
            temperature,
            airflow,
            humidity,
            duration,
            price,
            initial_weight,
            final_weight
        } = req.body;

        // Create new record
        const newRecord = {
            id: Math.max(...mockDryingData.map(r => r.id), 0) + 1,
            initial_mc: initial_mc || null,
            final_mc: final_mc || null,
            temperature: temperature || null,
            airflow: airflow || null,
            humidity: humidity || null,
            duration: duration || null,
            price: price || "0.00",
            initial_weight: initial_weight || null,
            final_weight: final_weight || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        mockDryingData.push(newRecord);

        res.status(201).json({
            success: true,
            data: newRecord,
            message: 'Drying data record created successfully'
        });
    } catch (error) {
        console.error('Error creating drying data record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create drying data record',
            message: error.message
        });
    }
});

// PUT /api/drying-data/:id - Update drying data record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            initial_mc,
            final_mc,
            temperature,
            airflow,
            humidity,
            duration,
            price,
            initial_weight,
            final_weight
        } = req.body;

        const recordIndex = mockDryingData.findIndex(record => record.id == id);
        
        if (recordIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Drying data record not found'
            });
        }

        // Update record
        mockDryingData[recordIndex] = {
            ...mockDryingData[recordIndex],
            initial_mc: initial_mc !== undefined ? initial_mc : mockDryingData[recordIndex].initial_mc,
            final_mc: final_mc !== undefined ? final_mc : mockDryingData[recordIndex].final_mc,
            temperature: temperature !== undefined ? temperature : mockDryingData[recordIndex].temperature,
            airflow: airflow !== undefined ? airflow : mockDryingData[recordIndex].airflow,
            humidity: humidity !== undefined ? humidity : mockDryingData[recordIndex].humidity,
            duration: duration !== undefined ? duration : mockDryingData[recordIndex].duration,
            price: price !== undefined ? price : mockDryingData[recordIndex].price,
            initial_weight: initial_weight !== undefined ? initial_weight : mockDryingData[recordIndex].initial_weight,
            final_weight: final_weight !== undefined ? final_weight : mockDryingData[recordIndex].final_weight,
            updated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            data: mockDryingData[recordIndex],
            message: 'Drying data record updated successfully'
        });
    } catch (error) {
        console.error('Error updating drying data record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update drying data record',
            message: error.message
        });
    }
});

// DELETE /api/drying-data/:id - Delete drying data record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const recordIndex = mockDryingData.findIndex(record => record.id == id);
        
        if (recordIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Drying data record not found'
            });
        }

        const deletedRecord = mockDryingData.splice(recordIndex, 1);

        res.json({
            success: true,
            data: deletedRecord[0],
            message: 'Drying data record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting drying data record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete drying data record',
            message: error.message
        });
    }
});

module.exports = router;
