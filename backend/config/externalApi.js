const DEFAULT_EXTERNAL_API_BASE_URL = 'https://digisaka.app/api';

module.exports = {
    baseUrl: (process.env.EXTERNAL_API_BASE_URL || DEFAULT_EXTERNAL_API_BASE_URL).replace(/\/$/, ''),
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '15000', 10)
};
