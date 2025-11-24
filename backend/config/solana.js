const { Connection, PublicKey, clusterApiUrl, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Solana configuration
const SOLANA_CONFIG = {
    network: process.env.SOLANA_NETWORK || 'devnet',
    programId: process.env.PROGRAM_ID || '6NcVSFj9gGYtSDWz1EPxY9BM2QZRrZ49fpadK6bACTgk',
    commitment: 'confirmed'
};

class SolanaService {
    constructor() {
        this.connection = null;
        this.program = null;
        this.programId = null;
        this.requestDelay = 500; // Increased base delay to 500ms between requests
        this.maxRetries = 5; // Increased from 3 to 5 retries
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    // Queue requests to prevent concurrent rate limiting
    async queueRequest(fn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ fn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const { fn, resolve, reject } = this.requestQueue.shift();
            
            // Enforce minimum delay between requests
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.requestDelay) {
                await new Promise(r => setTimeout(r, this.requestDelay - timeSinceLastRequest));
            }

            try {
                this.lastRequestTime = Date.now();
                const result = await this.retryWithBackoff(fn);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.isProcessingQueue = false;
    }

    // Exponential backoff retry helper with jitter
    async retryWithBackoff(fn, retries = this.maxRetries) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Add jitter to exponential backoff to prevent thundering herd
                if (attempt > 0) {
                    const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
                    const jitter = Math.random() * 1000; // Random 0-1s jitter
                    const totalDelay = baseDelay + jitter;
                    console.log(`Rate limited. Retrying in ${(totalDelay / 1000).toFixed(1)}s... (attempt ${attempt + 1}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, totalDelay));
                }
                return await fn();
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                // Check if error is rate limit related
                if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('rate'))) {
                    continue;
                }
                throw error;
            }
        }
    }

    // Add delay between sequential requests
    async delayRequest() {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    async initialize() {
        try {
            // Create connection
            const endpoint = SOLANA_CONFIG.network === 'mainnet-beta' 
                ? clusterApiUrl('mainnet-beta')
                : SOLANA_CONFIG.network === 'testnet'
                ? clusterApiUrl('testnet')
                : SOLANA_CONFIG.network === 'localhost'
                ? 'http://127.0.0.1:8899'
                : clusterApiUrl('devnet');
            
            this.connection = new Connection(endpoint, SOLANA_CONFIG.commitment);
            this.programId = new PublicKey(SOLANA_CONFIG.programId);
            
            console.log(`Connected to Solana ${SOLANA_CONFIG.network}`);
            console.log(`Program ID: ${this.programId.toString()}`);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Solana connection:', error);
            return false;
        }
    }

    async getTransactionPDA() {
        // Generate a random keypair for the transaction account
        return Keypair.generate();
    }
    
    async createRealTransaction(transactionData) {
        try {
            // Load wallet keypair from environment variable or local file
            let walletKeypair;

            if (process.env.SOLANA_PRIVATE_KEY) {
                try {
                    const privateKeyArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
                    if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
                        throw new Error(`Invalid private key format. Expected array of 64 numbers, got ${privateKeyArray.length} elements`);
                    }
                    walletKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
                } catch (parseError) {
                    throw new Error(`Failed to parse SOLANA_PRIVATE_KEY: ${parseError.message}`);
                }
            } else {
                const walletPath = path.join(process.env.HOME || '/tmp', '.config/solana/id.json');
                if (fs.existsSync(walletPath)) {
                    walletKeypair = Keypair.fromSecretKey(
                        Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
                    );
                } else {
                    throw new Error('No wallet keypair found. Set SOLANA_PRIVATE_KEY environment variable or ensure ~/.config/solana/id.json exists');
                }
            }

            // Derive PDA: seeds = ["tx", authority, nonce]
            const nonce = transactionData.nonce || 0;
            const [transactionPda] = await PublicKey.findProgramAddress(
                [Buffer.from('tx'), walletKeypair.publicKey.toBuffer(), Buffer.from([nonce])],
                this.programId
            );

            // Hash full JSON payload for data_hash
            const jsonData = JSON.stringify(transactionData);
            const hash = require('crypto').createHash('sha256').update(jsonData).digest();

            // Build instruction manually without using Anchor Program interface
            const discriminator = Buffer.from([227, 193, 53, 239, 55, 126, 112, 105]); // create_transaction discriminator
            
            // Serialize instruction data manually
            let instructionData = Buffer.alloc(0);
            instructionData = Buffer.concat([instructionData, discriminator]);
            
            // Serialize arguments in order: from_actor_id, to_actor_id, quantity, unit_price, payment_reference, nonce
            // NOTE: data_hash is now computed in backend and returned, not sent to blockchain
            instructionData = Buffer.concat([instructionData, this.serializeU64(transactionData.from_actor_id)]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(transactionData.to_actor_id)]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(parseInt(transactionData.quantity || '0'))]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(parseInt(transactionData.unit_price || '0'))]);
            instructionData = Buffer.concat([instructionData, this.serializeU8(transactionData.payment_reference)]);
            instructionData = Buffer.concat([instructionData, this.serializeU8(nonce)]);

            // Create instruction
            const ix = new TransactionInstruction({
                programId: this.programId,
                keys: [
                    { pubkey: transactionPda, isSigner: false, isWritable: true },
                    { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                data: instructionData,
            });

            // Memo instruction with full JSON
            const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            const memoInstruction = new TransactionInstruction({
                programId: MEMO_PROGRAM_ID,
                keys: [],
                data: Buffer.from(jsonData, 'utf8'),
            });

            const transaction = new Transaction().add(ix, memoInstruction);

            const { blockhash, lastValidBlockHeight } = await this.queueRequest(async () => {
                return await this.connection.getLatestBlockhash();
            });
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletKeypair.publicKey;

            const signature = await this.queueRequest(async () => {
                return await this.connection.sendTransaction(transaction, [walletKeypair], {
                    commitment: 'confirmed',
                    preflightCommitment: 'confirmed',
                });
            });

            await this.queueRequest(async () => {
                return await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
            });

            return {
                signature,
                publicKey: transactionPda.toString(),
                data_hash: hash.toString('hex'),
            };
        } catch (error) {
            console.error('Error creating real transaction:', error);
            throw error;
        }
    }

    // Phase 2: Add transaction to existing account (295× cheaper - no rent deposit)
    async addTransactionToExisting(transactionData, publicKey) {
        try {
            // Load wallet keypair from environment variable or local file
            let walletKeypair;

            if (process.env.SOLANA_PRIVATE_KEY) {
                try {
                    const privateKeyArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
                    if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
                        throw new Error(`Invalid private key format. Expected array of 64 numbers, got ${privateKeyArray.length} elements`);
                    }
                    walletKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
                } catch (parseError) {
                    throw new Error(`Failed to parse SOLANA_PRIVATE_KEY: ${parseError.message}`);
                }
            } else {
                const walletPath = path.join(process.env.HOME || '/tmp', '.config/solana/id.json');
                if (fs.existsSync(walletPath)) {
                    walletKeypair = Keypair.fromSecretKey(
                        Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
                    );
                } else {
                    throw new Error('No wallet keypair found. Set SOLANA_PRIVATE_KEY environment variable or ensure ~/.config/solana/id.json exists');
                }
            }

            const crypto = require('crypto');
            
            // Compute data hash
            const jsonData = JSON.stringify(transactionData);
            const hash = crypto.createHash('sha256').update(jsonData).digest();

            // Derive PDA from existing public key
            const transactionPda = new PublicKey(publicKey);

            // Get account info to verify it exists with queued requests
            const accountInfo = await this.queueRequest(async () => {
                return await this.connection.getAccountInfo(transactionPda);
            });
            if (!accountInfo) {
                throw new Error('Account does not exist. Use createRealTransaction first.');
            }

            // Build instruction for add_transaction (no nonce parameter needed)
            const discriminator = Buffer.from([48, 96, 174, 112, 81, 30, 239, 89]); // add_transaction discriminator
            let instructionData = discriminator;
            
            // Serialize arguments in order: from_actor_id, to_actor_id, quantity, unit_price, payment_reference
            instructionData = Buffer.concat([instructionData, this.serializeU64(transactionData.from_actor_id)]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(transactionData.to_actor_id)]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(parseInt(transactionData.quantity || '0'))]);
            instructionData = Buffer.concat([instructionData, this.serializeU64(parseInt(transactionData.unit_price || '0'))]);
            instructionData = Buffer.concat([instructionData, this.serializeU8(transactionData.payment_reference)]);

            // Create instruction
            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: transactionPda, isSigner: false, isWritable: true },
                    { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false }
                ],
                programId: this.programId,
                data: instructionData
            });

            // Create memo instruction with full transaction data
            const memoInstruction = new TransactionInstruction({
                keys: [{ pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false }],
                programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                data: Buffer.from(jsonData, 'utf8')
            });

            // Get latest blockhash with queued requests
            const { blockhash, lastValidBlockHeight } = await this.queueRequest(async () => {
                return await this.connection.getLatestBlockhash();
            });

            // Create transaction
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: walletKeypair.publicKey
            });

            transaction.add(instruction);
            transaction.add(memoInstruction);

            // Sign and send with queued requests
            transaction.sign(walletKeypair);

            const signature = await this.queueRequest(async () => {
                return await this.connection.sendTransaction(transaction, [walletKeypair], {
                    commitment: 'confirmed',
                    preflightCommitment: 'confirmed',
                });
            });

            await this.queueRequest(async () => {
                return await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
            });

            return {
                signature,
                publicKey: transactionPda.toString(),
                data_hash: hash.toString('hex'),
            };
        } catch (error) {
            console.error('Error adding transaction to existing account:', error);
            throw error;
        }
    }
    
    serializeString(str) {
        const strBuffer = Buffer.from(str, 'utf8');
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(strBuffer.length, 0);
        return Buffer.concat([lengthBuffer, strBuffer]);
    }
    
    serializeU64(num) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(num), 0);
        return buffer;
    }
    
    serializeVecU64(vec) {
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(vec.length, 0);
        const itemBuffers = vec.map(item => this.serializeU64(item));
        return Buffer.concat([lengthBuffer, ...itemBuffers]);
    }
    
    serializeU8(num) {
        return Buffer.from([num]);
    }
    
    serializeOption(value) {
        if (value === null || value === undefined) {
            return Buffer.from([0]); // None
        } else {
            return Buffer.concat([Buffer.from([1]), this.serializeString(value)]); // Some
        }
    }
    
    serializeOptionU8(value) {
        if (value === null || value === undefined) {
            return Buffer.from([0]); // None
        } else {
            return Buffer.concat([Buffer.from([1]), Buffer.from([value])]); // Some
        }
    }

    async getTransactionSignature(publicKey) {
        try {
            const signatures = await this.connection.getSignaturesForAddress(new PublicKey(publicKey), { limit: 1 });
            if (signatures && signatures.length > 0) {
                return signatures[0].signature;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getMemoDataForTransaction(publicKey) {
        try {
            // Get all transactions for this account to find the memo with queued requests
            const signatures = await this.queueRequest(async () => {
                return await this.connection.getSignaturesForAddress(new PublicKey(publicKey), { limit: 1 });
            });
            
            if (!signatures || signatures.length === 0) {
                console.log(`No signatures found for ${publicKey}`);
                return null;
            }
            
            // Get the most recent transaction
            const txSignature = signatures[0].signature;
            console.log(`Fetching transaction ${txSignature} for ${publicKey}`);
            
            const transaction = await this.queueRequest(async () => {
                return await this.connection.getTransaction(txSignature, {
                    maxSupportedTransactionVersion: 0
                });
            });
            
            if (!transaction || !transaction.transaction.message.instructions) {
                console.log(`No transaction or instructions found for ${txSignature}`);
                return null;
            }
            
            // Find the memo instruction
            const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
            console.log(`Looking for memo in ${transaction.transaction.message.instructions.length} instructions`);
            
            const accountKeys = transaction.transaction.message.accountKeys;
            
            for (const instruction of transaction.transaction.message.instructions) {
                // Handle both parsed and unparsed instruction formats
                let programId = null;
                if (instruction.programId) {
                    programId = instruction.programId.toString ? instruction.programId.toString() : instruction.programId;
                } else if (instruction.program) {
                    programId = instruction.program;
                } else if (instruction.programIdIndex !== undefined && accountKeys) {
                    // Unparsed format - look up program ID from account keys
                    const programAccount = accountKeys[instruction.programIdIndex];
                    programId = programAccount.toString ? programAccount.toString() : programAccount;
                }
                
                console.log(`Instruction program: ${programId}`);
                if (programId === MEMO_PROGRAM_ID) {
                    // The memo data is in the instruction data
                    let memoData = instruction.data;
                    console.log(`Raw memo data type: ${typeof memoData}`);
                    
                    if (typeof memoData === 'string') {
                        // Data is base64 encoded string from RPC
                        memoData = Buffer.from(memoData, 'base64');
                    } else if (Array.isArray(memoData)) {
                        memoData = Buffer.from(memoData);
                    }
                    
                    const memoText = memoData.toString('utf8');
                    console.log(`Found memo data (first 200 chars): ${memoText.substring(0, 200)}`);
                    
                    // Try to parse as JSON
                    try {
                        return JSON.parse(memoText);
                    } catch (parseErr) {
                        console.log(`Failed to parse memo JSON: ${parseErr.message}`);
                        // The memo data might not be JSON, which is fine
                        return null;
                    }
                }
            }
            
            console.log(`No memo instruction found for ${publicKey}`);
            return null;
        } catch (error) {
            console.error(`Error fetching memo for ${publicKey}:`, error.message);
            return null;
        }
    }

    async getAllTransactions() {
        try {
            // Get all accounts owned by our program with queued requests
            const accounts = await this.queueRequest(async () => {
                return await this.connection.getProgramAccounts(this.programId);
            });
            console.log(`Found ${accounts.length} accounts for program ${this.programId.toString()}`);
            
            const transactions = [];
            
            for (const account of accounts) {
                try {
                    // Try to decode the account data
                    const decoded = this.decodeTransactionAccount(account.account.data);
                    if (decoded && decoded.from_actor_id !== undefined) {
                        const publicKeyStr = account.pubkey.toString();
                        
                        // Fetch the actual transaction signature with queued requests
                        let signature = publicKeyStr;
                        try {
                            const actualSignature = await this.queueRequest(async () => {
                                return await this.getTransactionSignature(publicKeyStr);
                            });
                            if (actualSignature) {
                                signature = actualSignature;
                            }
                        } catch (sigErr) {
                            // Use publicKey as fallback
                        }
                        
                        // Use decoded on-chain data directly
                        const transactionData = {
                            publicKey: publicKeyStr,
                            signature: signature,
                            ...decoded,
                            blockchain_verified: true,
                            lamports: account.account.lamports,
                            owner: account.account.owner.toString()
                        };
                        
                        transactions.push(transactionData);
                    } else {
                        // Silently skip invalid accounts to reduce log noise
                    }
                } catch (err) {
                    // Silently skip decode errors to reduce log noise
                }
            }
            
            console.log(`Decoded ${transactions.length} valid transactions`);
            return transactions;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async getTransactionsByPublicKey(publicKey, includeMemo = false) {
        try {
            const pubkey = new PublicKey(publicKey);
            const accountInfo = await this.queueRequest(async () => {
                return await this.connection.getAccountInfo(pubkey);
            });
            
            if (!accountInfo) {
                return null;
            }
            
            const decoded = this.decodeTransactionAccount(accountInfo.data);
            if (!decoded) return null;
            
            const transactionData = { publicKey: publicKey, ...decoded };
            
            // Optionally fetch memo data if requested
            if (includeMemo) {
                try {
                    const memoData = await this.getMemoDataForTransaction(publicKey);
                    if (memoData) {
                        transactionData.batch_ids = memoData.batch_ids || decoded.batch_ids;
                        transactionData.status = memoData.status || decoded.status;
                        transactionData.quality = memoData.quality !== undefined ? memoData.quality : decoded.quality;
                        transactionData.moisture = memoData.moisture || null;
                        transactionData.transaction_date = memoData.transaction_date || null;
                        transactionData.is_test = memoData.is_test !== undefined ? memoData.is_test : decoded.is_test;
                        transactionData.json_data = JSON.stringify(memoData);
                    }
                } catch (memoErr) {
                    // Continue without memo data
                }
            }
            
            return transactionData;
        } catch (error) {
            console.error('Error fetching transaction by public key:', error);
            throw error;
        }
    }

    decodeTransactionAccount(data) {
        try {
            // Check if data is all zeros (uninitialized account)
            if (data.every(byte => byte === 0)) {
                return null;
            }
            
            // TransactionAccount structure (56 bytes total):
            // Discriminator: 8 bytes (skipped by Anchor)
            // from_actor_id: u64 (8 bytes)
            // to_actor_id: u64 (8 bytes)
            // quantity: u64 (8 bytes)
            // unit_price: u64 (8 bytes)
            // payment_reference: u8 (1 byte)
            // timestamp: i64 (8 bytes)
            // bump: u8 (1 byte)
            // nonce: u8 (1 byte)
            // transaction_count: u64 (8 bytes)
            
            let offset = 8; // Skip discriminator
            
            // Read on-chain fields
            if (offset + 8 > data.length) return null;
            const from_actor_id = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            if (offset + 8 > data.length) return null;
            const to_actor_id = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            if (offset + 8 > data.length) return null;
            const quantity = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            if (offset + 8 > data.length) return null;
            const unit_price = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            if (offset + 1 > data.length) return null;
            const payment_reference = data.readUInt8(offset);
            offset += 1;
            
            if (offset + 8 > data.length) return null;
            const timestamp = Number(data.readBigInt64LE(offset));
            offset += 8;
            
            if (offset + 1 > data.length) return null;
            const bump = data.readUInt8(offset);
            offset += 1;
            
            if (offset + 1 > data.length) return null;
            const nonce = data.readUInt8(offset);
            offset += 1;
            
            if (offset + 8 > data.length) return null;
            const transaction_count = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            // Convert timestamp to ISO date string
            // Timestamp is in seconds, convert to milliseconds
            let transaction_date = null;
            if (timestamp && timestamp > 0 && timestamp < 9999999999) {
                try {
                    const dateObj = new Date(timestamp * 1000);
                    if (!isNaN(dateObj.getTime())) {
                        transaction_date = dateObj.toISOString();
                    }
                } catch (e) {
                    // Invalid timestamp, leave as null
                }
            }
            
            // Return decoded transaction data
            return {
                from_actor_id,
                to_actor_id,
                quantity: quantity.toString(),
                unit_price: unit_price.toString(),
                payment_reference,
                timestamp,
                bump,
                nonce,
                transaction_count,
                created_at: timestamp,
                updated_at: timestamp,
                batch_ids: [],
                status: 'completed',
                is_test: 0,
                moisture: null,
                quality: null,
                transaction_date: transaction_date,
                data_format: 'binary' // Mark as binary format (on-chain only)
            };
        } catch (error) {
            console.error('Error decoding transaction account:', error);
            return null;
        }
    }
}

module.exports = new SolanaService();