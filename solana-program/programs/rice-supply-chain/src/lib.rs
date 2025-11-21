use anchor_lang::prelude::*;

declare_id!("ricekHKquRsgSvPzvsqJL826KbqW9vFXnLsxJv5F8T9");

#[program]
pub mod rice_supply_chain {
    use super::*;

    // Phase 1: Create new account (original behavior)
    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        from_actor_id: u64,
        to_actor_id: u64,
        quantity: u64,
        unit_price: u64,
        payment_reference: u8,
        nonce: u8,
    ) -> Result<()> {
        let tx = &mut ctx.accounts.transaction;

        // Initialize on first use
        if tx.nonce == 0 && tx.transaction_count == 0 {
            tx.bump = ctx.bumps.transaction;
            tx.nonce = nonce;
        }

        tx.from_actor_id = from_actor_id;
        tx.to_actor_id = to_actor_id;
        tx.quantity = quantity;
        tx.unit_price = unit_price;
        tx.payment_reference = payment_reference;
        tx.timestamp = Clock::get()?.unix_timestamp;
        tx.transaction_count = tx.transaction_count.saturating_add(1);

        msg!(
            "tx created: from={} to={} qty={} price={} nonce={} count={}",
            from_actor_id,
            to_actor_id,
            quantity,
            unit_price,
            nonce,
            tx.transaction_count
        );

        Ok(())
    }

    // Phase 2: Reuse existing account (295× cheaper - no rent deposit)
    pub fn add_transaction(
        ctx: Context<AddTransaction>,
        from_actor_id: u64,
        to_actor_id: u64,
        quantity: u64,
        unit_price: u64,
        payment_reference: u8,
    ) -> Result<()> {
        let tx = &mut ctx.accounts.transaction;

        // Update transaction data (reuse existing account)
        tx.from_actor_id = from_actor_id;
        tx.to_actor_id = to_actor_id;
        tx.quantity = quantity;
        tx.unit_price = unit_price;
        tx.payment_reference = payment_reference;
        tx.timestamp = Clock::get()?.unix_timestamp;
        tx.transaction_count = tx.transaction_count.saturating_add(1);

        msg!(
            "tx added (reused): from={} to={} qty={} price={} count={}",
            from_actor_id,
            to_actor_id,
            quantity,
            unit_price,
            tx.transaction_count
        );

        Ok(())
    }

    pub fn update_transaction(
        ctx: Context<UpdateTransaction>,
        quantity: Option<u64>,
        unit_price: Option<u64>,
        payment_reference: Option<u8>,
    ) -> Result<()> {
        let tx = &mut ctx.accounts.transaction;

        if let Some(q) = quantity {
            tx.quantity = q;
        }
        if let Some(p) = unit_price {
            tx.unit_price = p;
        }
        if let Some(r) = payment_reference {
            tx.payment_reference = r;
        }

        tx.timestamp = Clock::get()?.unix_timestamp;
        msg!("tx updated: {} count={}", tx.timestamp, tx.transaction_count);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(from_actor_id: u64, to_actor_id: u64, quantity: u64, unit_price: u64, payment_reference: u8, nonce: u8)]
pub struct CreateTransaction<'info> {
    #[account(
        init,
        payer = authority,
        space = TransactionAccount::SPACE,
        seeds = [b"tx", authority.key().as_ref(), &[nonce]],
        bump
    )]
    pub transaction: Account<'info, TransactionAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddTransaction<'info> {
    #[account(
        mut,
        seeds = [b"tx", authority.key().as_ref(), &[transaction.nonce]],
        bump = transaction.bump,
    )]
    pub transaction: Account<'info, TransactionAccount>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTransaction<'info> {
    #[account(
        mut,
        seeds = [b"tx", authority.key().as_ref(), &[transaction.nonce]],
        bump = transaction.bump,
    )]
    pub transaction: Account<'info, TransactionAccount>,

    pub authority: Signer<'info>,
}

#[account]
pub struct TransactionAccount {
    pub from_actor_id: u64,
    pub to_actor_id: u64,
    pub quantity: u64,
    pub unit_price: u64,
    pub payment_reference: u8,
    pub timestamp: i64,
    pub bump: u8,
    pub nonce: u8,
    pub transaction_count: u64,
}

impl TransactionAccount {
    pub const SPACE: usize = 8
        + 8
        + 8
        + 8
        + 8
        + 1
        + 8
        + 1
        + 1
        + 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid nonce or PDA derivation")]
    InvalidNonce,
    #[msg("Bump not found in context")]
    BumpNotFound,
}