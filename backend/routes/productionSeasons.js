const express = require('express');
const router = express.Router();
const externalApi = require('../services/externalApiClient');

function forwardSuccess(res, payload) {
    if (payload && typeof payload === 'object') {
        return res.json(payload);
    }

    return res.json({ success: true, data: payload });
}

function handleExternalApiError(res, error, fallbackMessage) {
    const status = error.status || error.response?.status || 500;
    const data = error.data || error.response?.data;
    const message = data?.message || error.message || fallbackMessage;

    if (data && typeof data === 'object') {
        return res.status(status).json({
            success: false,
            message,
            error: data.error || message,
            data: data.data || null
        });
    }

    return res.status(status).json({
        success: false,
        message
    });
}

// GET /api/production-seasons - proxy list retrieval
router.get('/', async (req, res) => {
    try {
        const data = await externalApi.get('/mobile/trace/season/get-all', {
            params: req.query
        });

        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error fetching production seasons:', error);
        handleExternalApiError(res, error, 'Failed to fetch production seasons');
    }
});

// GET /api/production-seasons/:id - proxy single season retrieval
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await externalApi.get(`/mobile/trace/season/${id}`);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error fetching production season ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to fetch production season');
    }
});

// POST /api/production-seasons - proxy create (upsert without id)
router.post('/', async (req, res) => {
    try {
        const data = await externalApi.post('/mobile/trace/season/upsert', req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error creating production season:', error);
        handleExternalApiError(res, error, 'Failed to create production season');
    }
});

// PUT /api/production-seasons/:id - proxy update (upsert with id)
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await externalApi.post(`/mobile/trace/season/upsert/${id}`, req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error updating production season ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to update production season');
    }
});

// DELETE /api/production-seasons/:id - proxy delete endpoint
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await externalApi.get(`/mobile/trace/season/delete/${id}`);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error deleting production season ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to delete production season');
    }
});

// GET /api/production-seasons/current/active - proxy active season lookup
router.get('/current/active', async (req, res) => {
    try {
        const data = await externalApi.get('/mobile/trace/season/get-active');
        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error fetching active production season:', error);
        handleExternalApiError(res, error, 'Failed to fetch current season');
    }
});

module.exports = router;