const { Connection, PublicKey, clusterApiUrl, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program } = require('@coral-xyz/anchor');
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
                // Production: Use environment variable
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
                // Development: Use local file
                const walletPath = path.join(process.env.HOME || '/tmp', '.config/solana/id.json');
                if (fs.existsSync(walletPath)) {
                    walletKeypair = Keypair.fromSecretKey(
                        Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
                    );
                } else {
                    throw new Error('No wallet keypair found. Set SOLANA_PRIVATE_KEY environment variable or ensure ~/.config/solana/id.json exists');
                }
            }
            
            // Generate new keypair for transaction account
            const transactionKeypair = Keypair.generate();

            // Setup Anchor provider and program using IDL
            const wallet = new anchor.Wallet(walletKeypair);
            const provider = new AnchorProvider(this.connection, wallet, { commitment: SOLANA_CONFIG.commitment });
            const idlPath = path.join(__dirname, '../../solana-program/target/idl/rice_supply_chain.json');
            const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
            const program = new Program(idl, this.programId, provider);

            // Build main instruction via Anchor (passing JSON string)
            const jsonData = JSON.stringify(transactionData);
            const instruction = await program.methods
                .createTransaction(jsonData)
                .accounts({
                    transaction: transactionKeypair.publicKey,
                    authority: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();
            
            // Create Memo program instruction to attach readable JSON
            const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            const memoInstruction = new TransactionInstruction({
                programId: MEMO_PROGRAM_ID,
                keys: [],
                data: Buffer.from(jsonData, 'utf8'),
            });

            // Create and send transaction (main ix + memo ix)
            const transaction = new Transaction().add(instruction, memoInstruction);
            
            // Get recent blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletKeypair.publicKey;
            
            const signature = await this.connection.sendTransaction(transaction, [walletKeypair, transactionKeypair], {
                commitment: 'confirmed',
                preflightCommitment: 'confirmed'
            });
            
            // Wait for confirmation with timeout
            const confirmation = await this.connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
            }, 'confirmed');
            
            return {
                signature,
                publicKey: transactionKeypair.publicKey.toString()
            };
        } catch (error) {
            console.error('Error creating real transaction:', error);
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
            const transactions = [];
            
            for (const account of accounts) {
                try {
                    // Try to decode the account data
                    const decoded = this.decodeTransactionAccount(account.account.data);
                    if (decoded && decoded.from_actor_id !== undefined) {
                        // Get transaction signatures for this account
                        let signature = null;
                        try {
                            const signatures = await this.connection.getSignaturesForAddress(account.pubkey, { limit: 1 });
                            if (signatures && signatures.length > 0) {
                                signature = signatures[0].signature;
                            }
                        } catch (sigError) {
                            console.warn('Could not fetch signature for account:', account.pubkey.toString());
                        }
                        
                        transactions.push({
                            publicKey: account.pubkey.toString(),
                            signature: signature || account.pubkey.toString(), // fallback to pubkey if no signature
                            ...decoded,
                            blockchain_verified: true,
                            lamports: account.account.lamports,
                            owner: account.account.owner.toString()
                        });
                    }
                } catch (err) {
                    console.warn('Failed to decode account:', account.pubkey.toString(), err.message);
                }
            }
            
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
            
            let offset = 8; // Skip discriminator
            
            // Read JSON string length
            if (offset + 4 > data.length) return null;
            const jsonLength = data.readUInt32LE(offset);
            offset += 4;
            
            // Read JSON string
            if (offset + jsonLength > data.length) return null;
            const jsonString = data.subarray(offset, offset + jsonLength).toString('utf8');
            offset += jsonLength;
            
            // Validate JSON string before parsing
            if (!jsonString || jsonString.trim() === '' || jsonLength === 0) {
                return null;
            }
            
            // Parse JSON data
            let transactionData;
            try {
                transactionData = JSON.parse(jsonString);
            } catch (parseError) {
                // Silently skip invalid JSON data instead of logging errors
                return null;
            }
            
            // Read timestamps
            if (offset + 8 > data.length) return null;
            const created_at = Number(data.readBigInt64LE(offset));
            offset += 8;
            
            if (offset + 8 > data.length) return null;
            const updated_at = Number(data.readBigInt64LE(offset));
            offset += 8;
            
            // Add metadata
            return {
                ...transactionData,
                created_at,
                updated_at,
                json_data: jsonString, // Include raw JSON for transparency
                data_format: 'json' // Mark as JSON format for frontend
            };
        } catch (error) {
            console.error('Error decoding transaction account:', error);
            return null;
        }
    }
}

module.exports = new SolanaService();