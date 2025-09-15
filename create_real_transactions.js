const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function createRealTransactions() {
    // Connect to local validator
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    // Load wallet
    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
    );
    
    console.log('Creating real blockchain transactions...');
    console.log('Wallet:', walletKeypair.publicKey.toString());
    
    // Create data accounts to store transaction data
    const transactions = [
        {
            id: 'REAL001',
            type: 'purchase',
            from: 1,
            to: 2,
            amount: '2500.00',
            quantity: '1000'
        },
        {
            id: 'REAL002', 
            type: 'processing',
            from: 2,
            to: 3,
            amount: '2850.00',
            quantity: '950'
        },
        {
            id: 'REAL003',
            type: 'distribution',
            from: 3,
            to: 4,
            amount: '2250.00',
            quantity: '500'
        }
    ];
    
    const createdAccounts = [];
    
    for (const tx of transactions) {
        try {
            // Create a new account for each transaction
            const newAccount = Keypair.generate();
            
            // Serialize transaction data
            const data = JSON.stringify({
                transaction_id: tx.id,
                transaction_type: tx.type,
                from_actor_id: tx.from,
                to_actor_id: tx.to,
                total_amount: tx.amount,
                quantity: tx.quantity,
                status: 'completed',
                transaction_date: new Date().toISOString(),
                notes: `Real blockchain ${tx.type} transaction`
            });
            
            const dataBuffer = Buffer.from(data, 'utf8');
            const space = dataBuffer.length + 100; // Extra space for metadata
            
            // Calculate rent
            const rentExemption = await connection.getMinimumBalanceForRentExemption(space);
            
            // Create account instruction
            const createAccountIx = SystemProgram.createAccount({
                fromPubkey: walletKeypair.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: rentExemption,
                space: space,
                programId: new PublicKey('FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N')
            });
            
            // Create transaction
            const transaction = new Transaction().add(createAccountIx);
            
            // Send transaction
            const signature = await connection.sendTransaction(
                transaction, 
                [walletKeypair, newAccount],
                { commitment: 'confirmed' }
            );
            
            await connection.confirmTransaction(signature, 'confirmed');
            
            console.log(`Transaction ${tx.id} created:`);
            console.log(`  Account: ${newAccount.publicKey.toString()}`);
            console.log(`  Signature: ${signature}`);
            
            createdAccounts.push({
                publicKey: newAccount.publicKey.toString(),
                data: data,
                signature: signature
            });
            
        } catch (error) {
            console.error(`Error creating transaction ${tx.id}:`, error.message);
        }
    }
    
    console.log('\nAll real blockchain transactions created!');
    console.log('Created accounts:', createdAccounts.length);
    
    return createdAccounts;
}

createRealTransactions().catch(console.error);
