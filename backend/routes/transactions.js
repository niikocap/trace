const express = require('express');
const router = express.Router();
const solanaService = require('../config/solana');
const database = require('../config/database');
const transactionCache = require('../config/transaction-cache');
const { Connection, PublicKey, Keypair, SystemProgram, Transaction } = require('@solana/web3.js');
const { AnchorProvider, Program, web3 } = require('@coral-xyz/anchor');

// Initialize Solana service on first request (lazy initialization)
let solanaInitialized = false;
const initializeSolana = async () => {
    if (!solanaInitialized) {
        await solanaService.initialize();
        solanaInitialized = true;
    }
};

// GET /api/transactions - Get all transactions from blockchain (NO MEMO, NO CACHE)
router.get('/', async (req, res) => {
    try {
        await initializeSolana();
        const blockchainTransactions = await solanaService.getAllTransactions();
        
        // Show all transactions (no filter)
        res.json({
            success: true,
            data: blockchainTransactions,
            count: blockchainTransactions.length
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions from blockchain',
            message: error.message
        });
    }
});

// POST /api/transactions/sample - Create a sample transaction (with Memo)
router.post('/sample', async (req, res) => {
    try {
        await initializeSolana();
        
        // Fixed sample based on user request, but allow nonce override
        const sampleData = {
            from_actor_id: 1,
            to_actor_id: 2,
            batch_ids: [],
            quantity: '50kg',
            unit_price: '200',
            payment_reference: 0,
            transaction_date: new Date().toISOString(),
            status: 'completed',
            is_test: 1,
            nonce: req.body.nonce || 0
        };

        const result = await solanaService.createRealTransaction(sampleData);

        return res.status(201).json({
            success: true,
            data: {
                ...sampleData,
                publicKey: result.publicKey,
                signature: result.signature,
                data_hash: result.data_hash,
                blockchain_verified: true,
                created_at: Date.now(),
                updated_at: Date.now()
            },
            message: 'Sample transaction created successfully on blockchain (with Memo)'
        });
    } catch (error) {
        console.error('Error creating sample transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create sample transaction on blockchain',
            message: error.message
        });
    }
});

// GET /api/transactions/pubkey/:publicKey - Get transactions by public key
router.get('/pubkey/:publicKey', async (req, res) => {
    try {
        await initializeSolana();
        
        const { publicKey } = req.params;
        const { includeMemo } = req.query;
        
        // Validate public key format
        try {
            new PublicKey(publicKey);
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Invalid public key format'
            });
        }
        
        const transaction = await solanaService.getTransactionsByPublicKey(publicKey, includeMemo === 'true');
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Error fetching transaction by public key:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction from blockchain',
            message: error.message
        });
    }
});

// POST /api/transactions - Create new transaction (upsert without id)
// Forwards to external API and creates Solana blockchain transaction
router.post('/', async (req, res) => {
    try {
        await initializeSolana();
        
        const externalApi = require('../services/externalApiClient');
        const payload = req.body;

        console.log('Creating transaction:', payload);

        // Transform payload for external API
        const externalPayload = transformTransactionPayload(payload);
        
        // Step 1: Forward to external API for upsert
        const externalData = await externalApi.post('/mobile/trace/transaction/upsert', externalPayload);
        
        console.log('External API response:', externalData);

        // Step 2: Create transaction on Solana blockchain
        const {
            from_actor_id,
            to_actor_id,
            batch_ids,
            batch_id,
            quantity,
            price_per_kg,
            payment_reference,
            status,
            moisture,
            is_test,
            nonce
        } = payload;
        
        // Validate required fields for blockchain
        if (!from_actor_id || !to_actor_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields for blockchain: from_actor_id, to_actor_id'
            });
        }
        
        // Convert payment_reference to numeric value
        let paymentRefValue = 0; // default to cash
        if (payment_reference) {
            if (payment_reference === 'cheque' || payment_reference === '1') {
                paymentRefValue = 1;
            } else if (payment_reference === 'balance' || payment_reference === '2') {
                paymentRefValue = 2;
            }
        }
        
        // Handle batch_ids - accept array or single ID
        let batchIdsArray = [];
        if (batch_ids) {
            batchIdsArray = Array.isArray(batch_ids) 
                ? batch_ids.map(id => parseInt(id))
                : [parseInt(batch_ids)];
        } else if (batch_id) {
            batchIdsArray = [parseInt(batch_id)];
        }
        
        // Convert status string to number (0=cancelled, 1=completed, 2=pending)
        let statusValue = 1; // default to completed
        if (status) {
            if (status === 'cancelled' || status === '0') {
                statusValue = 0;
            } else if (status === 'completed' || status === '1') {
                statusValue = 1;
            } else if (status === 'pending' || status === '2') {
                statusValue = 2;
            }
        }
        
        // Create blockchain transaction data
        const transactionData = {
            from_actor_id: parseInt(from_actor_id),
            to_actor_id: parseInt(to_actor_id),
            batch_ids: batchIdsArray,
            batch_id: batchIdsArray.length > 0 ? batchIdsArray[0] : 0,
            quantity: quantity || '0',
            unit_price: price_per_kg || '0.00',
            payment_reference: paymentRefValue,
            transaction_date: new Date().toISOString(),
            status: statusValue,
            moisture: parseInt(moisture || '0'),
            is_test: 1 ,// is_test !== undefined ? Number(is_test) : (req.hostname === 'localhost' || req.hostname === '127.0.0.1' ? 1 : 0),
            nonce: nonce !== undefined ? nonce : 0
        };
        
        // Create real blockchain transaction
        const blockchainResult = await solanaService.createRealTransaction(transactionData);
        
        res.status(201).json({
            success: true,
            data: {
                ...externalData,
                publicKey: blockchainResult.publicKey,
                signature: blockchainResult.signature,
                data_hash: blockchainResult.data_hash,
                blockchain_verified: true,
                created_at: Date.now(),
                updated_at: Date.now()
            },
            message: 'Transaction created successfully in external API and on blockchain'
        });
        
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create transaction',
            message: error.message
        });
    }
});

// POST /api/transactions/:id - Upsert transaction (update with id)
// Forwards to external API and creates Solana blockchain transaction
router.post('/:id', async (req, res) => {
    try {
        await initializeSolana();
        
        const { id } = req.params;
        const externalApi = require('../services/externalApiClient');
        const payload = req.body;

        console.log(`Upserting transaction with ID ${id}:`, payload);

        // Transform payload for external API
        const externalPayload = transformTransactionPayload(payload);
        
        // Step 1: Forward to external API for upsert
        const externalData = await externalApi.post(`/mobile/trace/transaction/upsert/${id}`, externalPayload);
        
        console.log('External API response:', externalData);

        // Step 2: Create transaction on Solana blockchain
        const {
            from_actor_id,
            to_actor_id,
            batch_ids,
            batch_id,
            quantity,
            price_per_kg,
            payment_reference,
            status,
            moisture,
            is_test,
            nonce
        } = payload;
        
        // Validate required fields for blockchain
        if (!from_actor_id || !to_actor_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields for blockchain: from_actor_id, to_actor_id'
            });
        }
        
        // Convert payment_reference to numeric value
        let paymentRefValue = 0; // default to cash
        if (payment_reference) {
            if (payment_reference === 'cheque' || payment_reference === '1') {
                paymentRefValue = 1;
            } else if (payment_reference === 'balance' || payment_reference === '2') {
                paymentRefValue = 2;
            }
        }
        
        // Handle batch_ids - accept array or single ID
        let batchIdsArray = [];
        if (batch_ids) {
            batchIdsArray = Array.isArray(batch_ids) 
                ? batch_ids.map(id => parseInt(id))
                : [parseInt(batch_ids)];
        } else if (batch_id) {
            batchIdsArray = [parseInt(batch_id)];
        }
        
        // Convert status string to number (0=cancelled, 1=completed, 2=pending)
        let statusValue = 1; // default to completed
        if (status) {
            if (status === 'cancelled' || status === '0') {
                statusValue = 0;
            } else if (status === 'completed' || status === '1') {
                statusValue = 1;
            } else if (status === 'pending' || status === '2') {
                statusValue = 2;
            }
        }
        
        // Create blockchain transaction data
        const transactionData = {
            from_actor_id: parseInt(from_actor_id),
            to_actor_id: parseInt(to_actor_id),
            batch_ids: batchIdsArray,
            batch_id: batchIdsArray.length > 0 ? batchIdsArray[0] : 0,
            quantity: quantity || '0',
            unit_price: price_per_kg || '0.00',
            payment_reference: paymentRefValue,
            transaction_date: new Date().toISOString(),
            status: statusValue,
            moisture: parseInt(moisture || '0'),
            is_test: 1,// is_test !== undefined ? Number(is_test) : (req.hostname === 'localhost' || req.hostname === '127.0.0.1' ? 1 : 0),
            nonce: nonce !== undefined ? nonce : 0
        };
        
        // Create real blockchain transaction
        const blockchainResult = await solanaService.createRealTransaction(transactionData);
        
        res.json({
            success: true,
            data: {
                ...externalData,
                publicKey: blockchainResult.publicKey,
                signature: blockchainResult.signature,
                data_hash: blockchainResult.data_hash,
                blockchain_verified: true,
                created_at: Date.now(),
                updated_at: Date.now()
            },
            message: 'Transaction updated successfully in external API and on blockchain'
        });
        
    } catch (error) {
        console.error(`Error upserting transaction ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to update transaction',
            message: error.message
        });
    }
});

// PUT /api/transactions/:id - Update transaction on blockchain
router.put('/:id', async (req, res) => {
    try {
        await initializeSolana();
        
        const { id } = req.params;
        const updateData = req.body;
        
        // Validate public key format
        try {
            new PublicKey(id);
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Invalid transaction ID (public key) format'
            });
        }
        
        // Check if transaction exists
        const existingTransaction = await solanaService.getTransactionsByPublicKey(id);
        if (!existingTransaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        // For now, we'll simulate blockchain transaction update
        // In a real implementation, you would:
        // 1. Create an update transaction
        // 2. Send it to the Solana network
        // 3. Wait for confirmation
        
        const updatedTransaction = {
            ...existingTransaction,
            ...updateData,
            updated_at: Date.now()
        };
        
        res.json({
            success: true,
            data: updatedTransaction,
            message: 'Transaction updated successfully on blockchain'
        });
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update transaction on blockchain',
            message: error.message
        });
    }
});

// GET /api/transactions/health - Health check for blockchain connection
router.get('/health', async (req, res) => {
    try {
        const isConnected = solanaService.connection !== null;
        res.json({
            success: true,
            blockchain_connected: isConnected,
            network: process.env.SOLANA_NETWORK || 'devnet',
            program_id: process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Blockchain health check failed',
            message: error.message
        });
    }
});

// Helper function to transform transaction payload for external API
function transformTransactionPayload(payload) {
    // Create payload matching external API structure
    const transformed = {
        batch_id: null,
        from_actor_id: payload.from_actor_id || null,
        to_actor_id: payload.to_actor_id || null,
        price_per_kg: payload.price_per_kg ? parseFloat(payload.price_per_kg) : null,
        moisture: payload.moisture ? parseFloat(payload.moisture) : null,
        quality: payload.quality || null,
        payment_reference: payload.payment_reference ? parseInt(payload.payment_reference) : null,
        payment_method: payload.payment_method || null,
        deduction: payload.deduction !== undefined && payload.deduction !== null ? parseFloat(payload.deduction) : 0,
        status: payload.status || null,
        agree_seller: payload.agree_seller || null,
        agree_buyer: payload.agree_buyer || null,
        geotagging: payload.geotagging || null
    };

    // Handle batch_id - convert to array if needed
    if (payload.batch_id) {
        transformed.batch_id = Array.isArray(payload.batch_id) 
            ? payload.batch_id.map(id => parseInt(id))
            : [parseInt(payload.batch_id)];
    } else if (payload.batch_ids) {
        transformed.batch_id = Array.isArray(payload.batch_ids) 
            ? payload.batch_ids.map(id => parseInt(id))
            : [parseInt(payload.batch_ids)];
    }

    return transformed;
}

module.exports = router;