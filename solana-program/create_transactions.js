const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Load the IDL
const idl = JSON.parse(fs.readFileSync('./target/idl/rice_supply_chain.json', 'utf8'));

async function createTransactions() {
    // Connect to local validator
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    
    // Load wallet
    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
    );
    
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);
    
    // Program ID
    const programId = new PublicKey('FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N');
    const program = new anchor.Program(idl, programId, provider);
    
    console.log('Creating real blockchain transactions...');
    
    // Transaction 1: Rice purchase from farmer
    const tx1Id = 'TRANS001';
    const [tx1PDA] = await PublicKey.findProgramAddress(
        [Buffer.from('transaction'), Buffer.from(tx1Id)],
        programId
    );
    
    try {
        const tx1 = await program.methods
            .createTransaction(
                tx1Id,
                'purchase',
                new anchor.BN(1), // from_actor_id
                new anchor.BN(2), // to_actor_id
                [new anchor.BN(1)], // batch_ids
                '1000', // quantity
                '2.50', // unit_price
                '2500.00', // total_amount
                ['PAY001'], // payment_reference
                new Date().toISOString(), // transaction_date
                'completed', // status
                'Rice purchase from farmer' // notes
            )
            .accounts({
                transaction: tx1PDA,
                authority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('Transaction 1 created:', tx1);
        console.log('Transaction 1 PDA:', tx1PDA.toString());
    } catch (error) {
        console.log('Transaction 1 already exists or error:', error.message);
    }
    
    // Transaction 2: Rice processing at mill
    const tx2Id = 'TRANS002';
    const [tx2PDA] = await PublicKey.findProgramAddress(
        [Buffer.from('transaction'), Buffer.from(tx2Id)],
        programId
    );
    
    try {
        const tx2 = await program.methods
            .createTransaction(
                tx2Id,
                'processing',
                new anchor.BN(2), // from_actor_id
                new anchor.BN(3), // to_actor_id
                [new anchor.BN(1)], // batch_ids
                '950', // quantity
                '3.00', // unit_price
                '2850.00', // total_amount
                ['PAY002'], // payment_reference
                new Date().toISOString(), // transaction_date
                'completed', // status
                'Rice processing at mill' // notes
            )
            .accounts({
                transaction: tx2PDA,
                authority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('Transaction 2 created:', tx2);
        console.log('Transaction 2 PDA:', tx2PDA.toString());
    } catch (error) {
        console.log('Transaction 2 already exists or error:', error.message);
    }
    
    // Transaction 3: Rice distribution to retailer
    const tx3Id = 'TRANS003';
    const [tx3PDA] = await PublicKey.findProgramAddress(
        [Buffer.from('transaction'), Buffer.from(tx3Id)],
        programId
    );
    
    try {
        const tx3 = await program.methods
            .createTransaction(
                tx3Id,
                'distribution',
                new anchor.BN(3), // from_actor_id
                new anchor.BN(4), // to_actor_id
                [new anchor.BN(2)], // batch_ids
                '500', // quantity
                '4.50', // unit_price
                '2250.00', // total_amount
                ['PAY003'], // payment_reference
                new Date().toISOString(), // transaction_date
                'completed', // status
                'Rice distribution to retailer' // notes
            )
            .accounts({
                transaction: tx3PDA,
                authority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        
        console.log('Transaction 3 created:', tx3);
        console.log('Transaction 3 PDA:', tx3PDA.toString());
    } catch (error) {
        console.log('Transaction 3 already exists or error:', error.message);
    }
    
    console.log('All transactions created successfully!');
}

createTransactions().catch(console.error);
