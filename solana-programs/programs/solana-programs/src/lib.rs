use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111"); // Placeholder

#[program]
pub mod solana_programs {
    use super::*;

    // Initialize the global config (admin only)
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        admin_key: Pubkey,
        rate_per_byte_per_day: u64,
        min_duration_days: u32,
        withdrawal_wallet: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin_key = admin_key;
        config.rate_per_byte_per_day = rate_per_byte_per_day;
        config.min_duration_days = min_duration_days;
        config.withdrawal_wallet = withdrawal_wallet;
        Ok(())
    }

    // User creates a deposit for file storage
    pub fn create_deposit(
        ctx: Context<CreateDeposit>,
        content_cid: String,
        duration_days: u32,
        deposit_amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        
        // Validate minimum duration
        require!(
            duration_days >= config.min_duration_days,
            ErrorCode::DurationTooShort
        );

        // Calculate required amount
        let file_size = 1024; // This will come from Storacha
        let required_amount = file_size * duration_days as u64 * config.rate_per_byte_per_day;
        
        require!(
            deposit_amount >= required_amount,
            ErrorCode::InsufficientDeposit
        );

        // Transfer SOL from user to deposit account
        // Use separate scope to avoid borrow conflicts
        {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.deposit.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_ctx, deposit_amount)?;
        }

        // Now set deposit data (after transfer is complete)
        let deposit = &mut ctx.accounts.deposit;
        deposit.deposit_key = ctx.accounts.user.key();
        deposit.content_cid = content_cid;
        deposit.duration_days = duration_days;
        deposit.deposit_amount = deposit_amount;
        deposit.deposit_slot = Clock::get()?.slot;
        deposit.last_claimed_slot = Clock::get()?.slot;

        Ok(())
    }

    // Admin can withdraw accumulated fees
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        // Validate admin
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            ErrorCode::UnauthorizedAdmin
        );

        // Transfer from deposit to withdrawal wallet
        **ctx.accounts.deposit.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.withdrawal_wallet.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    // Update the rate (admin only)
    pub fn update_rate(ctx: Context<UpdateConfig>, new_rate: u64) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            ErrorCode::UnauthorizedAdmin
        );
        
        ctx.accounts.config.rate_per_byte_per_day = new_rate;
        Ok(())
    }
}

// Account Structures
#[account]
pub struct Config {
    pub admin_key: Pubkey,           
    pub rate_per_byte_per_day: u64,  
    pub min_duration_days: u32,      
    pub withdrawal_wallet: Pubkey,   
}

#[account]
pub struct Deposit {
    pub deposit_key: Pubkey,         
    pub content_cid: String,         
    pub duration_days: u32,          
    pub deposit_amount: u64,         
    pub deposit_slot: u64,           
    pub last_claimed_slot: u64,      
}

// Context structs
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 4 + 32,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(content_cid: String)]
pub struct CreateDeposit<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + content_cid.len() + 4 + 8 + 8 + 8,
        seeds = [b"deposit", user.key().as_ref(), content_cid.as_bytes()],
        bump
    )]
    pub deposit: Account<'info, Deposit>,
    
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut)]
    pub deposit: Account<'info, Deposit>,
    
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    
    pub admin: Signer<'info>,
    
    /// CHECK: This is the withdrawal wallet from config
    #[account(mut)]
    pub withdrawal_wallet: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    
    pub admin: Signer<'info>,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Duration must be at least minimum days")]
    DurationTooShort,
    
    #[msg("Deposit amount insufficient for storage cost")]
    InsufficientDeposit,
    
    #[msg("Only admin can perform this action")]
    UnauthorizedAdmin,
}