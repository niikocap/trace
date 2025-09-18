use anchor_lang::prelude::*;
use serde::{Deserialize, Serialize};

declare_id!("FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N");

#[program]
pub mod rice_supply_chain {
    use super::*;

    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        transaction_id: String,
        transaction_type: String,
        from_actor_id: u64,
        to_actor_id: u64,
        batch_ids: Vec<u64>,
        quantity: String,
        unit_price: String,
        total_amount: String,
        payment_reference: Vec<String>,
        transaction_date: String,
        status: String,
        quality: Option<u8>,
        moisture: Option<String>,
        notes: Option<String>,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        transaction.transaction_id = transaction_id;
        transaction.transaction_type = transaction_type;
        transaction.from_actor_id = from_actor_id;
        transaction.to_actor_id = to_actor_id;
        transaction.batch_ids = batch_ids;
        transaction.quantity = quantity;
        transaction.unit_price = unit_price;
        transaction.total_amount = total_amount;
        transaction.payment_reference = payment_reference;
        transaction.transaction_date = transaction_date;
        transaction.status = status;
        transaction.quality = quality;
        transaction.moisture = moisture;
        transaction.notes = notes;
        transaction.created_at = Clock::get()?.unix_timestamp;
        transaction.updated_at = Clock::get()?.unix_timestamp;
        transaction.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn update_transaction(
        ctx: Context<UpdateTransaction>,
        transaction_type: Option<String>,
        from_actor_id: Option<u64>,
        to_actor_id: Option<u64>,
        batch_ids: Option<Vec<u64>>,
        quantity: Option<String>,
        unit_price: Option<String>,
        total_amount: Option<String>,
        payment_reference: Option<Vec<String>>,
        transaction_date: Option<String>,
        status: Option<String>,
        quality: Option<u8>,
        moisture: Option<String>,
        notes: Option<String>,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        
        if let Some(t_type) = transaction_type {
            transaction.transaction_type = t_type;
        }
        if let Some(from_id) = from_actor_id {
            transaction.from_actor_id = from_id;
        }
        if let Some(to_id) = to_actor_id {
            transaction.to_actor_id = to_id;
        }
        if let Some(batches) = batch_ids {
            transaction.batch_ids = batches;
        }
        if let Some(qty) = quantity {
            transaction.quantity = qty;
        }
        if let Some(price) = unit_price {
            transaction.unit_price = price;
        }
        if let Some(amount) = total_amount {
            transaction.total_amount = amount;
        }
        if let Some(payment_ref) = payment_reference {
            transaction.payment_reference = payment_ref;
        }
        if let Some(date) = transaction_date {
            transaction.transaction_date = date;
        }
        if let Some(stat) = status {
            transaction.status = stat;
        }
        if let Some(qual) = quality {
            transaction.quality = Some(qual);
        }
        if let Some(moist) = moisture {
            transaction.moisture = Some(moist);
        }
        if let Some(note) = notes {
            transaction.notes = Some(note);
        }
        
        transaction.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(transaction_id: String)]
pub struct CreateTransaction<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ChainTransaction::INIT_SPACE,
        seeds = [b"transaction", transaction_id.as_bytes()],
        bump
    )]
    pub transaction: Account<'info, ChainTransaction>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTransaction<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub transaction: Account<'info, ChainTransaction>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(Serialize, Deserialize)]
pub struct ChainTransaction {
    pub transaction_id: String,
    pub transaction_type: String,
    pub from_actor_id: u64,
    pub to_actor_id: u64,
    pub batch_ids: Vec<u64>,
    pub quantity: String,
    pub unit_price: String,
    pub total_amount: String,
    pub payment_reference: Vec<String>,
    pub transaction_date: String,
    pub status: String,
    /// Quality grade: 0=premium, 1=well-milled, 2=regular, 3=broken
    pub quality: Option<u8>,
    /// Moisture content percentage
    pub moisture: Option<String>,
    pub notes: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub authority: Pubkey,
}

impl Space for ChainTransaction {
    const INIT_SPACE: usize = 8 + // discriminator
        4 + 32 + // transaction_id (String)
        4 + 32 + // transaction_type (String)
        8 + // from_actor_id (u64)
        8 + // to_actor_id (u64)
        4 + 8 * 10 + // batch_ids (Vec<u64>) - assuming max 10 batches
        4 + 32 + // quantity (String)
        4 + 32 + // unit_price (String)
        4 + 32 + // total_amount (String)
        4 + 4 * 10 + 32 * 10 + // payment_reference (Vec<String>) - assuming max 10 refs
        4 + 32 + // transaction_date (String)
        4 + 32 + // status (String)
        1 + 1 + // quality (Option<u8>)
        1 + 4 + 16 + // moisture (Option<String>)
        1 + 4 + 32 + // notes (Option<String>)
        8 + // created_at (i64)
        8 + // updated_at (i64)
        32; // authority (Pubkey)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Transaction not found")]
    TransactionNotFound,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid transaction data")]
    InvalidTransactionData,
}