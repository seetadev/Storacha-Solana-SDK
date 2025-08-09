use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

// ============================================================================
// ACCOUNT STRUCTURES (State)
// ============================================================================

/// Global configuration account - stores system-wide parameters
#[account]
pub struct Config {
    /// Public key of the admin who can update settings
    pub admin_key: Pubkey,           // 32 bytes
    /// Cost per byte per day in lamports (e.g., 1000 lamports per byte per day)
    pub rate_per_byte_per_day: u64,  // 8 bytes
    /// Minimum storage duration in days (e.g., 30 days minimum)
    pub min_duration_days: u32,      // 4 bytes
    /// Wallet address where admin fees are withdrawn to
    pub withdrawal_wallet: Pubkey,   // 32 bytes
}

impl Config {
    pub const LEN: usize = 8 + 32 + 8 + 4 + 32; // discriminator + fields
}

/// Individual deposit record - one per user per file
#[account]
pub struct Deposit {
    /// Public key of the user who made the deposit
    pub deposit_key: Pubkey,         // 32 bytes
    /// Content Identifier (CID) of the stored file
    pub content_cid: String,         // 4 + len bytes (variable)
    /// Size of the file in bytes
    pub file_size: u64,              // 8 bytes
    /// How many days the file should be stored
    pub duration_days: u32,          // 4 bytes
    /// Total amount deposited in lamports
    pub deposit_amount: u64,         // 8 bytes
    /// Solana slot when the deposit was made
    pub deposit_slot: u64,           // 8 bytes
    /// Last slot when rewards were claimed (for linear release calculation)
    pub last_claimed_slot: u64,      // 8 bytes
    /// Total amount claimed so far in lamports
    pub total_claimed: u64,          // 8 bytes
}

impl Deposit {
    pub fn len(content_cid: &str) -> usize {
        8 + 32 + 4 + content_cid.len() + 8 + 4 + 8 + 8 + 8 + 8
    }
}

/// Central escrow vault that holds all user deposits
#[account]
pub struct EscrowVault {
    /// Total lamports deposited by all users
    pub total_deposits: u64,         // 8 bytes
    /// Total lamports claimed by service providers
    pub total_claimed: u64,          // 8 bytes
}

impl EscrowVault {
    pub const LEN: usize = 8 + 8 + 8; // discriminator + fields
}

// ============================================================================
// INSTRUCTION CONTEXTS
// ============================================================================

/// Context for initializing the global configuration
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        space = EscrowVault::LEN,
        seeds = [b"escrow"],
        bump
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for creating a new deposit
#[derive(Accounts)]
#[instruction(content_cid: String)]
pub struct CreateDeposit<'info> {
    #[account(
      init,
      payer = user,
      space = Deposit::len(&content_cid),
      // the CIDs can be greater than 32bytes so this is
      // neccessary to that borsh doesn't yell at us when we're trying to
      // construct the deposit instruction
      seeds = [b"deposit", user.key().as_ref(), &Sha256::digest(content_cid.as_bytes())],
      bump
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(mut, seeds = [b"escrow"], bump)]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for service provider claiming rewards
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub deposit: Account<'info, Deposit>,

    #[account(mut, seeds = [b"escrow"], bump)]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    pub service_provider: Signer<'info>,

    /// CHECK: This can be any wallet address provided by the service provider
    #[account(mut)]
    pub service_provider_wallet: UncheckedAccount<'info>,
}

/// Context for admin withdrawing accumulated fees
#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut, seeds = [b"escrow"], bump)]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,

    /// CHECK: This address is validated against config.withdrawal_wallet in the instruction
    #[account(mut)]
    pub withdrawal_wallet: UncheckedAccount<'info>,
}

/// Context for updating configuration (rates, min duration, etc.)
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct DepositCreated {
    pub user: Pubkey,
    pub content_cid: String,
    pub file_size: u64,
    pub duration_days: u32,
    pub deposit_amount: u64,
    pub slot: u64,
}

#[event]
pub struct RewardsClaimed {
    pub deposit_key: Pubkey,
    pub service_provider: Pubkey,
    pub amount: u64,
    pub slot: u64,
}

#[event]
pub struct RateUpdated {
    pub old_rate: u64,
    pub new_rate: u64,
}

#[event]
pub struct MinDurationUpdated {
    pub old_duration: u32,
    pub new_duration: u32,
}

#[event]
pub struct FeesWithdrawn {
    pub admin: Pubkey,
    pub amount: u64,
    pub slot: u64,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum StorachaError {
    #[msg("Duration must be at least the minimum required days")]
    DurationTooShort,

    #[msg("Deposit amount is insufficient for the storage cost (size × duration × rate)")]
    InsufficientDeposit,

    #[msg("Only the program admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("No rewards are available to claim at this time")]
    NothingToClaim,

    #[msg("Storage duration has expired")]
    StorageExpired,

    #[msg("Invalid file size - must be greater than 0")]
    InvalidFileSize,

    #[msg("Invalid duration - must be greater than 0")]
    InvalidDuration,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Insufficient funds in escrow vault")]
    InsufficientEscrowFunds,

    #[msg("Invalid CID format")]
    InvalidCid,
}
