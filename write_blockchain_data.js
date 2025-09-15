const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

async function writeBlockchainData() {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
    );
    
    const programId = new PublicKey('FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N');
    
    // Transaction data to write
    const transactions = [
        {
            account: 'HWzWqT6pHyPtCvATTNBkChzXLbDGgU137xKmvDv3sXbU',
            data: {
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
            }
        },
        {
            account: '96sRTaHqvCrG1e5jKCACBrUwXQ6VX1Jw6gTedHK466Xr',
            data: {
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
            }
        },
        {
            account: '3iZbrNy3ZYs5oMLDNHLtLR4tAncLNJpLQcAR6aZUbMdG',
            data: {
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
        }
    ];
    
    console.log('Writing real data to blockchain accounts...');
    
    for (const tx of transactions) {
        try {
            const accountPubkey = new PublicKey(tx.account);
            const dataString = JSON.stringify(tx.data);
            const dataBuffer = Buffer.from(dataString, 'utf8');
            
            // Create instruction to write data
            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: accountPubkey, isSigner: false, isWritable: true },
                    { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false }
                ],
                programId: programId,
                data: dataBuffer
            });
            
            const transaction = new Transaction().add(instruction);
            const signature = await connection.sendTransaction(transaction, [walletKeypair]);
            await connection.confirmTransaction(signature);
            
            console.log(`Data written to ${tx.account}: ${tx.data.transaction_id}`);
            console.log(`Signature: ${signature}`);
            
        } catch (error) {
            console.error(`Error writing to ${tx.account}:`, error.message);
        }
    }
    
    console.log('All data written to blockchain!');
}

writeBlockchainData().catch(console.error);
