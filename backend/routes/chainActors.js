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

// GET /api/chain-actors - proxy list retrieval
router.get('/', async (req, res) => {
    try {
        const data = await externalApi.get('/mobile/trace/actor/get-all', {
            params: req.query
        });

        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error fetching chain actors:', error);
        handleExternalApiError(res, error, 'Failed to fetch chain actors');
    }
});

// GET /api/chain-actors/search-users - proxy user search for actor assignment
router.get('/search-users', async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Query parameter "query" with at least 2 characters is required'
        });
    }

    try {
        const data = await externalApi.get(`/mobile/get-all-users/${encodeURIComponent(query)}`);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error searching users with query "${query}":`, error);
        handleExternalApiError(res, error, 'Failed to search users');
    }
});

// GET /api/chain-actors/:id - proxy single actor retrieval
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await externalApi.get(`/mobile/trace/actor/${id}`);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error fetching chain actor ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to fetch chain actor');
    }
});

// POST /api/chain-actors - proxy create (upsert) without id
router.post('/', async (req, res) => {
    try {
        const data = await externalApi.post('/mobile/trace/actor/upsert', req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error('Proxy error creating chain actor:', error);
        handleExternalApiError(res, error, 'Failed to create chain actor');
    }
});

// PUT /api/chain-actors/:id - proxy update (upsert with id)
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const data = await externalApi.post(`/mobile/trace/actor/upsert/${id}`, req.body);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error updating chain actor ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to update chain actor');
    }
});

// DELETE /api/chain-actors/:id - proxy delete endpoint
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // External API currently expects a GET request for deletion
        const data = await externalApi.get(`/mobile/trace/actor/delete/${id}`);
        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error deleting chain actor ${id}:`, error);
        handleExternalApiError(res, error, 'Failed to delete chain actor');
    }
});

// GET /api/chain-actors/type/:type - proxy filtered list by type
router.get('/type/:type', async (req, res) => {
    const { type } = req.params;

    try {
        const data = await externalApi.get('/mobile/trace/actor/get-all', {
            params: { ...req.query, type }
        });

        forwardSuccess(res, data);
    } catch (error) {
        console.error(`Proxy error fetching chain actors by type ${type}:`, error);
        handleExternalApiError(res, error, 'Failed to fetch chain actors by type');
    }
});

module.exports = router;