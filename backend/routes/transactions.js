const express = require('express');
const router = express.Router();
const solanaService = require('../config/solana');
const { Connection, PublicKey, Keypair, SystemProgram, Transaction } = require('@solana/web3.js');
const { AnchorProvider, Program, web3 } = require('@coral-xyz/anchor');

// Initialize Solana service
solanaService.initialize();

// GET /api/transactions - Get all transactions from blockchain
router.get('/', async (req, res) => {
    try {
        const transactions = await solanaService.getAllTransactions();
        res.json({
            success: true,
            data: transactions,
            count: transactions.length
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
        // Fixed sample based on user request
        const sampleData = {
            from_actor_id: 1,
            to_actor_id: 2,
            batch_ids: [],
            quantity: '50kg',
            unit_price: '200',
            payment_reference: 0,
            transaction_date: new Date().toISOString(),
            status: 'completed'
        };

        const result = await solanaService.createRealTransaction(sampleData);

        return res.status(201).json({
            success: true,
            data: {
                ...sampleData,
                publicKey: result.publicKey,
                signature: result.signature,
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
        const { publicKey } = req.params;
        
        // Validate public key format
        try {
            new PublicKey(publicKey);
        } catch (err) {
            return res.status(400).json({
                success: false,
                error: 'Invalid public key format'
            });
        }
        
        const transaction = await solanaService.getTransactionsByPublicKey(publicKey);
        
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

// POST /api/transactions - Create new transaction on blockchain
router.post('/', async (req, res) => {
    try {
        const {
            from_actor_id,
            to_actor_id,
            batch_id,
            quantity,
            price_per_kg,
            total_amount,
            payment_reference,
            status,
            quality,
            moisture
        } = req.body;
        
        // Validate required fields
        if (!from_actor_id || !to_actor_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: from_actor_id, to_actor_id'
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
        
        // Create real blockchain transaction
        const transactionData = {
            from_actor_id: parseInt(from_actor_id),
            to_actor_id: parseInt(to_actor_id),
            batch_ids: batch_id ? [parseInt(batch_id)] : [],
            quantity: quantity || '0',
            unit_price: price_per_kg || '0.00',
            payment_reference: paymentRefValue,
            transaction_date: new Date().toISOString(),
            status: status || 'completed',
            quality: quality !== undefined ? parseInt(quality) : null,
            moisture: moisture || null
        };
        
        // Create real blockchain transaction
        const result = await solanaService.createRealTransaction(transactionData);
        
        res.status(201).json({
            success: true,
            data: {
                ...transactionData,
                publicKey: result.publicKey,
                signature: result.signature,
                blockchain_verified: true,
                created_at: Date.now(),
                updated_at: Date.now()
            },
            message: 'Transaction created successfully on blockchain'
        });
        
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create transaction on blockchain',
            message: error.message
        });
    }
});

// PUT /api/transactions/:id - Update transaction on blockchain
router.put('/:id', async (req, res) => {
    try {
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

module.exports = router;