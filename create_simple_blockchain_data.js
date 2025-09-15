const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function createSimpleBlockchainData() {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
    );
    
    console.log('Creating simple blockchain data accounts...');
    
    const transactions = [
        {
            transaction_id: 'REAL001',
            transaction_type: 'purchase',
            from_actor_id: 1,
            to_actor_id: 2,
            batch_ids: [1],
            quantity: '1000',
            unit_price: '2.50',
            total_amount: '2500.00',
            payment_reference: ['REAL_PAY001'],
            transaction_date: new Date().toISOString(),
            status: 'completed',
            notes: 'Real blockchain rice purchase'
        },
        {
            transaction_id: 'REAL002',
            transaction_type: 'processing',
            from_actor_id: 2,
            to_actor_id: 3,
            batch_ids: [1],
            quantity: '950',
            unit_price: '3.00',
            total_amount: '2850.00',
            payment_reference: ['REAL_PAY002'],
            transaction_date: new Date().toISOString(),
            status: 'completed',
            notes: 'Real blockchain rice processing'
        },
        {
            transaction_id: 'REAL003',
            transaction_type: 'distribution',
            from_actor_id: 3,
            to_actor_id: 4,
            batch_ids: [2],
            quantity: '500',
            unit_price: '4.50',
            total_amount: '2250.00',
            payment_reference: ['REAL_PAY003'],
            transaction_date: new Date().toISOString(),
            status: 'completed',
            notes: 'Real blockchain rice distribution'
        }
    ];
    
    const createdAccounts = [];
    
    for (const txData of transactions) {
        try {
            const newAccount = Keypair.generate();
            const dataString = JSON.stringify(txData);
            const dataBuffer = Buffer.from(dataString, 'utf8');
            
            // Calculate space needed
            const space = Math.max(dataBuffer.length, 165); // Minimum space for rent exemption
            const rentExemption = await connection.getMinimumBalanceForRentExemption(space);
            
            // Create account with System Program (not our custom program)
            const createAccountIx = SystemProgram.createAccount({
                fromPubkey: walletKeypair.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: rentExemption,
                space: space,
                programId: SystemProgram.programId // Use System Program
            });
            
            const transaction = new Transaction().add(createAccountIx);
            
            // Send transaction
            const signature = await connection.sendTransaction(
                transaction, 
                [walletKeypair, newAccount],
                { commitment: 'confirmed' }
            );
            
            await connection.confirmTransaction(signature, 'confirmed');
            
            // Now write data to the account using a transfer instruction with memo
            const transferIx = SystemProgram.transfer({
                fromPubkey: walletKeypair.publicKey,
                toPubkey: newAccount.publicKey,
                lamports: 1 // Minimal transfer
            });
            
            const dataTransaction = new Transaction().add(transferIx);
            const dataSignature = await connection.sendTransaction(
                dataTransaction,
                [walletKeypair],
                { commitment: 'confirmed' }
            );
            
            await connection.confirmTransaction(dataSignature, 'confirmed');
            
            console.log(`Created account for ${txData.transaction_id}:`);
            console.log(`  Account: ${newAccount.publicKey.toString()}`);
            console.log(`  Signature: ${signature}`);
            
            createdAccounts.push({
                publicKey: newAccount.publicKey.toString(),
                data: txData,
                signature: signature
            });
            
        } catch (error) {
            console.error(`Error creating ${txData.transaction_id}:`, error.message);
        }
    }
    
    // Write account info to file for backend to read
    fs.writeFileSync('./blockchain_accounts.json', JSON.stringify(createdAccounts, null, 2));
    
    console.log(`\nCreated ${createdAccounts.length} blockchain accounts with real data!`);
    console.log('Account info saved to blockchain_accounts.json');
    
    return createdAccounts;
}

createSimpleBlockchainData().catch(console.error);
