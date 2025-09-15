const { Connection, Keypair, PublicKey, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

async function createWorkingBlockchainData() {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
    );
    
    const programId = new PublicKey('FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N');
    
    console.log('Creating working blockchain data...');
    
    const transactions = [
        {
            transaction_id: 'WORK001',
            transaction_type: 'purchase',
            from_actor_id: 1,
            to_actor_id: 2,
            batch_ids: [1],
            quantity: '1000',
            unit_price: '2.50',
            total_amount: '2500.00',
            payment_reference: ['WORK_PAY001'],
            transaction_date: new Date().toISOString(),
            status: 'completed',
            notes: 'Working blockchain rice purchase'
        },
        {
            transaction_id: 'WORK002',
            transaction_type: 'processing',
            from_actor_id: 2,
            to_actor_id: 3,
            batch_ids: [1],
            quantity: '950',
            unit_price: '3.00',
            total_amount: '2850.00',
            payment_reference: ['WORK_PAY002'],
            transaction_date: new Date().toISOString(),
            status: 'completed',
            notes: 'Working blockchain rice processing'
        }
    ];
    
    const createdAccounts = [];
    
    for (const txData of transactions) {
        try {
            // Create a new account for this transaction
            const newAccount = Keypair.generate();
            
            // Convert transaction data to JSON string
            const dataString = JSON.stringify(txData);
            const dataBuffer = Buffer.from(dataString, 'utf8');
            
            // Calculate space needed (add padding for safety)
            const space = Math.max(dataBuffer.length + 100, 500);
            const rentExemption = await connection.getMinimumBalanceForRentExemption(space);
            
            // Create account owned by our program
            const createAccountIx = SystemProgram.createAccount({
                fromPubkey: walletKeypair.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: rentExemption,
                space: space,
                programId: programId // Owned by our program
            });
            
            // Create proper Anchor instruction for create_transaction
            // Anchor instruction format: [8-byte discriminator] + [serialized args]
            const discriminator = Buffer.from([0x8e, 0x4e, 0x4c, 0x7a, 0x4c, 0x4e, 0x8e, 0x4e]); // create_transaction discriminator
            
            // Serialize the transaction data in Anchor format
            const serializedData = Buffer.concat([
                discriminator,
                serializeString(txData.transaction_id),
                serializeString(txData.transaction_type),
                serializeU64(txData.from_actor_id),
                serializeU64(txData.to_actor_id),
                serializeVecU64(txData.batch_ids),
                serializeString(txData.quantity),
                serializeString(txData.unit_price),
                serializeString(txData.total_amount),
                serializeVecString(txData.payment_reference),
                serializeString(txData.transaction_date),
                serializeString(txData.status),
                serializeOption(txData.notes)
            ]);
            
            const writeDataIx = new TransactionInstruction({
                keys: [
                    { pubkey: newAccount.publicKey, isSigner: false, isWritable: true },
                    { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
                ],
                programId: programId,
                data: serializedData
            });
            
            // Create transaction with both instructions
            const transaction = new Transaction()
                .add(createAccountIx)
                .add(writeDataIx);
            
            // Send transaction
            const signature = await connection.sendTransaction(
                transaction, 
                [walletKeypair, newAccount],
                { commitment: 'confirmed' }
            );
            
            await connection.confirmTransaction(signature, 'confirmed');
            
            console.log(`Created working account for ${txData.transaction_id}:`);
            console.log(`  Account: ${newAccount.publicKey.toString()}`);
            console.log(`  Signature: ${signature}`);
            
            // Verify the account was created with our data
            const accountInfo = await connection.getAccountInfo(newAccount.publicKey);
            if (accountInfo && accountInfo.owner.equals(programId)) {
                console.log(`  ✓ Account owned by program: ${programId.toString()}`);
                console.log(`  ✓ Data length: ${accountInfo.data.length} bytes`);
                
                // Try to read back the data
                const readData = accountInfo.data.toString('utf8').replace(/\0/g, '');
                if (readData.includes(txData.transaction_id)) {
                    console.log(`  ✓ Data verification successful`);
                } else {
                    console.log(`  ⚠ Data verification failed`);
                }
            }
            
            createdAccounts.push({
                publicKey: newAccount.publicKey.toString(),
                signature: signature,
                data: txData
            });
            
        } catch (error) {
            console.error(`Error creating ${txData.transaction_id}:`, error.message);
        }
    }
    
    console.log(`\nCreated ${createdAccounts.length} working blockchain accounts!`);
    return createdAccounts;
}

// Helper serialization functions
function serializeString(str) {
    const strBuffer = Buffer.from(str, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(strBuffer.length, 0);
    return Buffer.concat([lengthBuffer, strBuffer]);
}

function serializeU64(num) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(num), 0);
    return buffer;
}

function serializeVecU64(vec) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(vec.length, 0);
    const itemBuffers = vec.map(item => serializeU64(item));
    return Buffer.concat([lengthBuffer, ...itemBuffers]);
}

function serializeVecString(vec) {
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(vec.length, 0);
    const itemBuffers = vec.map(item => serializeString(item));
    return Buffer.concat([lengthBuffer, ...itemBuffers]);
}

function serializeOption(value) {
    if (value === null || value === undefined) {
        return Buffer.from([0]); // None
    } else {
        return Buffer.concat([Buffer.from([1]), serializeString(value)]); // Some
    }
}

createWorkingBlockchainData().catch(console.error);
