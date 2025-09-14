const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { AnchorProvider, Program, Idl } = require('@coral-xyz/anchor');

// Solana configuration
const SOLANA_CONFIG = {
    network: process.env.SOLANA_NETWORK || 'devnet',
    programId: process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
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

    async getAllTransactions() {
        try {
            const accounts = await this.connection.getProgramAccounts(this.programId, {
                filters: [
                    {
                        dataSize: 1000 // Approximate size of ChainTransaction account
                    }
                ]
            });
            
            const transactions = [];
            for (const account of accounts) {
                try {
                    const decoded = this.decodeTransactionAccount(account.account.data);
                    if (decoded) {
                        transactions.push({
                            publicKey: account.pubkey.toString(),
                            ...decoded
                        });
                    }
                } catch (err) {
                    console.warn('Failed to decode account:', account.pubkey.toString());
                }
            }
            
            return transactions;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
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
            // This is a simplified decoder - in a real implementation,
            // you would use the IDL to properly decode the account data
            // For now, we'll return a mock structure that matches our schema
            
            // Skip the 8-byte discriminator
            let offset = 8;
            
            // This is a placeholder implementation
            // In a real scenario, you'd use Anchor's IDL to decode properly
            return {
                transaction_id: 'decoded_id',
                transaction_type: 'decoded_type',
                from_actor_id: 1,
                to_actor_id: 2,
                batch_ids: [1, 2],
                quantity: '100',
                unit_price: '50.00',
                total_amount: '5000.00',
                payment_reference: ['ref1'],
                transaction_date: new Date().toISOString(),
                status: 'completed',
                notes: 'Decoded transaction',
                created_at: Date.now(),
                updated_at: Date.now()
            };
        } catch (error) {
            console.error('Error decoding transaction data:', error);
            return null;
        }
    }
}

module.exports = new SolanaService();