use anchor_lang::prelude::*;

pub mod types;
pub use types::*;

declare_id!("8GdsZx2WiMxF4timRwWRiddWxsk5VDMZZ7E8VUqUVW4S");

#[program]
pub mod solana_programs {
    use super::*;

    /// Initialize the global config (admin only)
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

        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.total_deposits = 0;
        escrow.total_claimed = 0;

        Ok(())
    }

    /// User creates a deposit for file storage
    pub fn create_deposit(
        ctx: Context<CreateDeposit>,
        content_cid: String,
        file_size: u64,
        duration_days: u32,
        deposit_amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;

        // Validate minimum duration
        require!(
            duration_days >= config.min_duration_days,
            StorachaError::DurationTooShort
        );

        // Calculate required amount
        let required_amount = file_size * duration_days as u64 * config.rate_per_byte_per_day;

        require!(
            deposit_amount >= required_amount,
            StorachaError::InsufficientDeposit
        );

        // Transfer SOL from user to escrow vault
        {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_ctx, deposit_amount)?;
        }

        // Set deposit data
        let deposit = &mut ctx.accounts.deposit;
        deposit.deposit_key = ctx.accounts.user.key();
        deposit.content_cid = content_cid.clone();
        deposit.file_size = file_size;
        deposit.duration_days = duration_days;
        deposit.deposit_amount = deposit_amount;
        deposit.deposit_slot = Clock::get()?.slot;
        deposit.last_claimed_slot = Clock::get()?.slot;
        deposit.total_claimed = 0;

        // Update escrow vault totals
        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.total_deposits = escrow.total_deposits.checked_add(deposit_amount).unwrap();

        // Emit event
        emit!(DepositCreated {
            user: ctx.accounts.user.key(),
            content_cid,
            file_size,
            duration_days,
            deposit_amount,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    /// Service provider claims accrued rewards (linear release over time)
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let deposit = &mut ctx.accounts.deposit;
        let current_slot = Clock::get()?.slot;

        // Calculate slots elapsed since last claim
        let slots_since_last_claim = current_slot.saturating_sub(deposit.last_claimed_slot);

        // Calculate total slots for the entire duration (assuming ~2.5 slots per second, ~86400 seconds per day)
        let slots_per_day = 216_000; // Approximate
        let total_slots = deposit.duration_days as u64 * slots_per_day;

        // Calculate claimable amount (linear release)
        let claimable_per_slot = deposit.deposit_amount / total_slots;
        let claimable_amount = claimable_per_slot * slots_since_last_claim;

        // Ensure we don't claim more than deposited
        let remaining_amount = deposit.deposit_amount.saturating_sub(deposit.total_claimed);
        let actual_claim = claimable_amount.min(remaining_amount);

        require!(actual_claim > 0, StorachaError::NothingToClaim);

        // Transfer from escrow vault to service provider
        **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= actual_claim;
        **ctx.accounts.service_provider_wallet.to_account_info().try_borrow_mut_lamports()? += actual_claim;

        // Update deposit state
        deposit.last_claimed_slot = current_slot;
        deposit.total_claimed += actual_claim;

        // Update escrow vault
        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.total_claimed = escrow.total_claimed.checked_add(actual_claim).unwrap();

        emit!(RewardsClaimed {
            deposit_key: deposit.deposit_key,
            service_provider: ctx.accounts.service_provider.key(),
            amount: actual_claim,
            slot: current_slot,
        });

        Ok(())
    }

    /// Admin withdraws accumulated fees
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            StorachaError::UnauthorizedAdmin
        );

        // Transfer from escrow vault to withdrawal wallet
        **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.withdrawal_wallet.to_account_info().try_borrow_mut_lamports()? += amount;

        emit!(FeesWithdrawn {
            admin: ctx.accounts.admin.key(),
            amount,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    /// Update the rate (admin only)
    pub fn update_rate(ctx: Context<UpdateConfig>, new_rate: u64) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            StorachaError::UnauthorizedAdmin
        );

        let old_rate = ctx.accounts.config.rate_per_byte_per_day;
        ctx.accounts.config.rate_per_byte_per_day = new_rate;

        emit!(RateUpdated {
            old_rate,
            new_rate,
        });

        Ok(())
    }

    /// Update minimum duration (admin only)
    pub fn update_min_duration(ctx: Context<UpdateConfig>, new_min_duration: u32) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            StorachaError::UnauthorizedAdmin
        );

        let old_duration = ctx.accounts.config.min_duration_days;
        ctx.accounts.config.min_duration_days = new_min_duration;

        emit!(MinDurationUpdated {
            old_duration,
            new_duration: new_min_duration,
        });

        Ok(())
    }
}
