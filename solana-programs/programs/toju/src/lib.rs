use anchor_lang::prelude::*;

pub mod types;
pub use types::*;

declare_id!("CSXnfQsFWxdPB5pnS73TQDA6ivK6kcFnRwtt6TgFquxH");

#[program]
pub mod toju {
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

        use std::str::FromStr;
        cid::Cid::from_str(&content_cid).map_err(|_| error!(StorachaError::InvalidCid))?;

        require!(
            content_cid.len() <= 200,
            StorachaError::CidTooLong
        );

        // file size must be greater than zero
        require!(
            file_size > 0,
            StorachaError::InvalidFileSize
        );

        // Validate minimum duration
        require!(
            duration_days >= config.min_duration_days,
            StorachaError::DurationTooShort
        );

        let size_duration = file_size
            .checked_mul(duration_days as u64)
            .ok_or(StorachaError::ArithmeticOverflow)?;
        let required_amount = size_duration
            .checked_mul(config.rate_per_byte_per_day)
            .ok_or(StorachaError::ArithmeticOverflow)?;

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

        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.total_deposits = escrow
            .total_deposits
            .checked_add(deposit_amount)
            .ok_or(StorachaError::ArithmeticOverflow)?;

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

    /// Extend storage duration for an existing upload
    pub fn extend_storage_duration(
        ctx: Context<ExtendStorageDuration>,
        content_cid: String,
        duration: u32,
        storage_extension_cost: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let deposit = &mut ctx.accounts.deposit;

        // valid the cid with multiformats
        use std::str::FromStr;
        cid::Cid::from_str(&content_cid).map_err(|_| error!(StorachaError::InvalidCid))?;

        require!(duration > 0, StorachaError::InvalidDuration);

        let size_duration = deposit
            .file_size
            .checked_mul(duration as u64)
            .ok_or(StorachaError::ArithmeticOverflow)?;
        let required_cost = size_duration
            .checked_mul(config.rate_per_byte_per_day)
            .ok_or(StorachaError::ArithmeticOverflow)?;

        require!(
            storage_extension_cost >= required_cost,
            StorachaError::InsufficientDeposit
        );

        {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_ctx, storage_extension_cost)?;
        }

        deposit.duration_days = deposit
            .duration_days
            .checked_add(duration)
            .ok_or(StorachaError::ArithmeticOverflow)?;
        deposit.deposit_amount = deposit
            .deposit_amount
            .checked_add(storage_extension_cost)
            .ok_or(StorachaError::ArithmeticOverflow)?;

        let escrow = &mut ctx.accounts.escrow_vault;
        escrow.total_deposits = escrow
            .total_deposits
            .checked_add(storage_extension_cost)
            .ok_or(StorachaError::ArithmeticOverflow)?;

        emit!(StorageDurationExtended {
            content_cid,
            duration,
            user: ctx.accounts.user.key(),
            new_cost: storage_extension_cost,
            slot: Clock::get()?.slot,
            extended_duration: deposit.duration_days,
            total_amount: deposit.deposit_amount
        });

        Ok(())
    }

    /// withdraws accumulated fees
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin_key,
            StorachaError::UnauthorizedAdmin
        );

        // validate withdrawal wallet
        require!(
            ctx.accounts.withdrawal_wallet.key() == ctx.accounts.config.withdrawal_wallet,
            StorachaError::InvalidWithdrawalWallet
        );

        // ensure escrow has sufficient funds
        let escrow_balance = ctx.accounts.escrow_vault.to_account_info().lamports();
        require!(
            escrow_balance >= amount,
            StorachaError::InsufficientEscrowFunds
        );

        **ctx
            .accounts
            .escrow_vault
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .withdrawal_wallet
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

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

        emit!(RateUpdated { old_rate, new_rate });

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
