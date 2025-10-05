use anchor_lang::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json;

declare_id!("FS1fWouL7tpGRTErvRcdcWpgU2BsSuTfbEpEDBufWF1N");

#[program]
pub mod rice_supply_chain {
    use super::*;

    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        json_data: String,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;

        // Parse and validate JSON
        let parsed_data: TransactionData = serde_json::from_str(&json_data)
            .map_err(|_| ErrorCode::InvalidTransactionData)?;

        msg!("✅ Received JSON: {}", json_data);
        msg!(
            "From {} to {} | Qty: {} | Price: {}",
            parsed_data.from_actor_id,
            parsed_data.to_actor_id,
            parsed_data.quantity,
            parsed_data.unit_price
        );

        transaction.json_data = json_data;
        transaction.created_at = Clock::get()?.unix_timestamp;
        transaction.updated_at = transaction.created_at;
        transaction.authority = ctx.accounts.authority.key();

        Ok(())
    }

    pub fn update_transaction(
        ctx: Context<UpdateTransaction>,
        json_data: String,
    ) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;

        let _parsed_data: TransactionData = serde_json::from_str(&json_data)
            .map_err(|_| ErrorCode::InvalidTransactionData)?;

        transaction.json_data = json_data;
        transaction.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateTransaction<'info> {
    #[account(
        init,
        payer = authority,
        // 8 (discriminator) + 4 + 2048 (json_data String) + 8 (created_at) + 8 (updated_at) + 32 (authority)
        space = 8 + (4 + 2048) + 8 + 8 + 32,
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
pub struct ChainTransaction {
    pub json_data: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub authority: Pubkey,
}

// Removed Space trait usage; space is specified directly in the init attribute above.

#[derive(Serialize, Deserialize)]
pub struct TransactionData {
    pub from_actor_id: u64,
    pub to_actor_id: u64,
    pub batch_ids: Vec<u64>,
    pub quantity: String,
    pub unit_price: String,
    pub payment_reference: u8, // 0=cash, 1=cheque, 2=balance
    pub transaction_date: String,
    pub status: String,
    pub quality: Option<u8>, // 0=premium, etc.
    pub moisture: Option<String>,
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
