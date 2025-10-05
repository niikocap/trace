const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, clusterApiUrl } = require('@solana/web3.js');
const fs = require('fs');

async function insertSample() {
    try {
        // Connect to devnet
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Load wallet
        const walletKeypair = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
        );
        
        // Generate new keypair for transaction account
        const transactionKeypair = Keypair.generate();
        
        // Sample transaction data
        const transactionData = {
            from_actor_id: 2,
            to_actor_id: 3,
            batch_ids: [1],
            quantity: '75kg',
            unit_price: '250',
            payment_reference: 1, // cheque
            transaction_date: new Date().toISOString(),
            status: 'completed',
            quality: 85,
            moisture: '14%'
        };
        
        const jsonData = JSON.stringify(transactionData);
        
        // Create instruction data with discriminator for create_transaction
        const discriminator = Buffer.from([227, 193, 53, 239, 55, 126, 112, 105]);
        
        // Serialize JSON string (4 bytes length + string)
        const jsonBuffer = Buffer.from(jsonData, 'utf8');
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(jsonBuffer.length, 0);
        const serializedJson = Buffer.concat([lengthBuffer, jsonBuffer]);
        
        const instructionData = Buffer.concat([discriminator, serializedJson]);
        
        // Create main instruction
        const programId = new PublicKey('FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N');
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: transactionKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: programId,
            data: instructionData,
        });
        
        // Create Memo instruction
        const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
        const memoInstruction = new TransactionInstruction({
            programId: MEMO_PROGRAM_ID,
            keys: [],
            data: Buffer.from(jsonData, 'utf8'),
        });
        
        // Create and send transaction
        const transaction = new Transaction().add(instruction, memoInstruction);
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletKeypair.publicKey;
        
        const signature = await connection.sendTransaction(transaction, [walletKeypair, transactionKeypair], {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed'
        });
        
        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
        }, 'confirmed');
        
        console.log('✅ Sample transaction created successfully!');
        console.log('Signature:', signature);
        console.log('Public Key:', transactionKeypair.publicKey.toString());
        console.log('Transaction Data:', JSON.stringify(transactionData, null, 2));
        console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        
    } catch (error) {
        console.error('❌ Error creating sample transaction:', error.message);
    }
}

insertSample();
