const { Connection, PublicKey, clusterApiUrl, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const { AnchorProvider, Program, Idl, BN } = require('@coral-xyz/anchor');
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

    async getTransactionPDA(transactionId) {
        const [pda] = await PublicKey.findProgramAddress(
            [Buffer.from('transaction'), Buffer.from(transactionId)],
            this.programId
        );
        return pda;
    }
    
    async createRealTransaction(transactionData) {
        try {
            // Load wallet keypair
            const walletPath = path.join(process.env.HOME, '.config/solana/id.json');
            const walletKeypair = Keypair.fromSecretKey(
                Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
            );
            
            // Get PDA for transaction
            const [transactionPDA] = await PublicKey.findProgramAddress(
                [Buffer.from('transaction'), Buffer.from(transactionData.transaction_id)],
                this.programId
            );
            
            // Create instruction data with correct discriminator
            const discriminator = Buffer.from([0xe3, 0xc1, 0x35, 0xef, 0x37, 0x7e, 0x70, 0x69]); // create_transaction discriminator
            
            // Create instruction data with proper Anchor format
            const instructionData = Buffer.concat([
                discriminator,
                this.serializeString(transactionData.transaction_id),
                this.serializeString(transactionData.transaction_type),
                this.serializeU64(transactionData.from_actor_id),
                this.serializeU64(transactionData.to_actor_id),
                this.serializeVecU64(transactionData.batch_ids || []),
                this.serializeString(transactionData.quantity),
                this.serializeString(transactionData.unit_price),
                this.serializeString(transactionData.total_amount),
                this.serializeVecString(transactionData.payment_reference || []),
                this.serializeString(transactionData.transaction_date),
                this.serializeString(transactionData.status),
                this.serializeOption(transactionData.notes)
            ]);
            
            // Create transaction instruction
            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: transactionPDA, isSigner: false, isWritable: true },
                    { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: this.programId,
                data: instructionData,
            });
            
            // Create and send transaction
            const transaction = new Transaction().add(instruction);
            const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
                commitment: 'confirmed'
            });
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            return {
                signature,
                publicKey: transactionPDA.toString()
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
    
    serializeVecString(vec) {
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(vec.length, 0);
        const itemBuffers = vec.map(item => this.serializeString(item));
        return Buffer.concat([lengthBuffer, ...itemBuffers]);
    }
    
    serializeOption(value) {
        if (value === null || value === undefined) {
            return Buffer.from([0]); // None
        } else {
            return Buffer.concat([Buffer.from([1]), this.serializeString(value)]); // Some
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
                    if (decoded && decoded.transaction_id) {
                        transactions.push({
                            publicKey: account.pubkey.toString(),
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
            
            // Try simple JSON parsing first (for test data)
            try {
                const dataString = data.toString('utf8').replace(/\0/g, '');
                if (dataString.startsWith('{')) {
                    const parsed = JSON.parse(dataString);
                    if (parsed.transaction_id) {
                        return parsed;
                    }
                }
            } catch (e) {
                // Not JSON, continue with Anchor decoding
            }
            
            let offset = 8; // Skip discriminator
            
            // Read transaction_id (String)
            if (offset + 4 > data.length) return null;
            const transactionIdLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + transactionIdLength > data.length) return null;
            const transaction_id = data.subarray(offset, offset + transactionIdLength).toString('utf8');
            offset += transactionIdLength;
            
            // Read transaction_type (String)
            if (offset + 4 > data.length) return null;
            const transactionTypeLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + transactionTypeLength > data.length) return null;
            const transaction_type = data.subarray(offset, offset + transactionTypeLength).toString('utf8');
            offset += transactionTypeLength;
            
            // Read from_actor_id (u64)
            if (offset + 8 > data.length) return null;
            const from_actor_id = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            // Read to_actor_id (u64)
            if (offset + 8 > data.length) return null;
            const to_actor_id = Number(data.readBigUInt64LE(offset));
            offset += 8;
            
            // Read batch_ids (Vec<u64>)
            if (offset + 4 > data.length) return null;
            const batchIdsLength = data.readUInt32LE(offset);
            offset += 4;
            const batch_ids = [];
            for (let i = 0; i < batchIdsLength; i++) {
                if (offset + 8 > data.length) return null;
                batch_ids.push(Number(data.readBigUInt64LE(offset)));
                offset += 8;
            }
            
            // Read quantity (String)
            if (offset + 4 > data.length) return null;
            const quantityLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + quantityLength > data.length) return null;
            const quantity = data.subarray(offset, offset + quantityLength).toString('utf8');
            offset += quantityLength;
            
            // Read unit_price (String)
            if (offset + 4 > data.length) return null;
            const unitPriceLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + unitPriceLength > data.length) return null;
            const unit_price = data.subarray(offset, offset + unitPriceLength).toString('utf8');
            offset += unitPriceLength;
            
            // Read total_amount (String)
            if (offset + 4 > data.length) return null;
            const totalAmountLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + totalAmountLength > data.length) return null;
            const total_amount = data.subarray(offset, offset + totalAmountLength).toString('utf8');
            offset += totalAmountLength;
            
            // Read payment_reference (Vec<String>)
            if (offset + 4 > data.length) return null;
            const paymentRefLength = data.readUInt32LE(offset);
            offset += 4;
            const payment_reference = [];
            for (let i = 0; i < paymentRefLength; i++) {
                if (offset + 4 > data.length) return null;
                const strLength = data.readUInt32LE(offset);
                offset += 4;
                if (offset + strLength > data.length) return null;
                payment_reference.push(data.subarray(offset, offset + strLength).toString('utf8'));
                offset += strLength;
            }
            
            // Read transaction_date (String)
            if (offset + 4 > data.length) return null;
            const transactionDateLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + transactionDateLength > data.length) return null;
            const transaction_date = data.subarray(offset, offset + transactionDateLength).toString('utf8');
            offset += transactionDateLength;
            
            // Read status (String)
            if (offset + 4 > data.length) return null;
            const statusLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + statusLength > data.length) return null;
            const status = data.subarray(offset, offset + statusLength).toString('utf8');
            offset += statusLength;
            
            // Read notes (Option<String>)
            if (offset + 1 > data.length) return null;
            const hasNotes = data.readUInt8(offset);
            offset += 1;
            let notes = null;
            if (hasNotes === 1) {
                if (offset + 4 > data.length) return null;
                const notesLength = data.readUInt32LE(offset);
                offset += 4;
                if (offset + notesLength > data.length) return null;
                notes = data.subarray(offset, offset + notesLength).toString('utf8');
            }
            
            return {
                transaction_id,
                transaction_type,
                from_actor_id,
                to_actor_id,
                batch_ids,
                quantity,
                unit_price,
                total_amount,
                payment_reference,
                transaction_date,
                status,
                notes
            };
        } catch (error) {
            console.error('Error decoding transaction account:', error);
            return null;
        }
    }
}

module.exports = new SolanaService();