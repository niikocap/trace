const { Connection, PublicKey, clusterApiUrl, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Solana configuration
const SOLANA_CONFIG = {
    network: process.env.SOLANA_NETWORK || 'devnet',
    programId: process.env.PROGRAM_ID || 'FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N',
    commitment: 'confirmed'
};

class SolanaService {
    constructor() {
        this.connection = null;
        this.program = null;
        this.programId = null;
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

            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletKeypair.publicKey;

            const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
                commitment: 'confirmed',
                preflightCommitment: 'confirmed',
            });

            await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

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

            // Get account info to verify it exists
            const accountInfo = await this.connection.getAccountInfo(transactionPda);
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

            // Get latest blockhash
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

            // Create transaction
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: walletKeypair.publicKey
            });

            transaction.add(instruction);
            transaction.add(memoInstruction);

            // Sign and send
            transaction.sign(walletKeypair);

            const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
                commitment: 'confirmed',
                preflightCommitment: 'confirmed',
            });

            await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

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

    async getAllTransactions() {
        try {
            // Get all accounts owned by our program
            const accounts = await this.connection.getProgramAccounts(this.programId);
            console.log(`Found ${accounts.length} accounts for program ${this.programId.toString()}`);
            
            const transactions = [];
            
            for (const account of accounts) {
                try {
                    // Try to decode the account data
                    const decoded = this.decodeTransactionAccount(account.account.data);
                    if (decoded && decoded.from_actor_id !== undefined) {
                        // Use the timestamp from the account as the signature (no extra RPC call)
                        // This avoids rate limiting issues
                        transactions.push({
                            publicKey: account.pubkey.toString(),
                            signature: account.pubkey.toString(), // Use pubkey as fallback signature
                            ...decoded,
                            blockchain_verified: true,
                            lamports: account.account.lamports,
                            owner: account.account.owner.toString()
                        });
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

    async getTransactionsByPublicKey(publicKey) {
        try {
            const pubkey = new PublicKey(publicKey);
            const accountInfo = await this.connection.getAccountInfo(pubkey);
            
            if (!accountInfo) {
                return null;
            }
            
            const decoded = this.decodeTransactionAccount(accountInfo.data);
            return decoded ? { publicKey: publicKey, ...decoded } : null;
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
                data_format: 'binary' // Mark as binary format (on-chain only)
            };
        } catch (error) {
            console.error('Error decoding transaction account:', error);
            return null;
        }
    }
}

module.exports = new SolanaService();