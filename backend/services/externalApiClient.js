const axios = require('axios');
const { baseUrl, timeout } = require('../config/externalApi');

const client = axios.create({
    baseURL: baseUrl,
    timeout,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
});

function normalizePath(path) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
}

async function request(method, path, options = {}) {
    const { params, data, headers, responseType } = options;

    try {
        const response = await client.request({
            method,
            url: normalizePath(path),
            params,
            data,
            headers,
            responseType
        });

        return response.data;
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message || 'External API request failed';

        const err = new Error(message);
        err.status = status;
        err.data = error.response?.data;
        err.isExternalApiError = true;
        throw err;
    }
}

module.exports = {
    request,
    get: (path, options) => request('get', path, options),
    post: (path, data, options) => request('post', path, { ...options, data }),
    put: (path, data, options) => request('put', path, { ...options, data }),
    patch: (path, data, options) => request('patch', path, { ...options, data }),
    delete: (path, options) => request('delete', path, options)
};
