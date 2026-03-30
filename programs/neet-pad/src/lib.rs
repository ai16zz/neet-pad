use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("5w6esZD8WLkj6PfUgeyB2j1RWP6RGNpNkcYY9R3dwWyY"); // replaced after deploy

// ─── Constants ───────────────────────────────────────────────────────────────
const TRADING_FEE_BPS: u64 = 50;          // 0.50 %
const LAUNCH_FEE_LAMPORTS: u64 = 20_000_000; // 0.02 SOL
const LAUNCH_FEE_NEET: u64 = 500_000_000;    // 500 NEET (6 decimals)
const GRADUATION_LAMPORTS: u64 = 1_000_000_000; // 1 SOL graduation fee

// pump.fun-style virtual reserves
const VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL in lamports
const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_191_000_000; // 1.073B tokens (6 dec)
const TOKEN_TOTAL_SUPPLY: u64 = 1_000_000_000_000_000;  // 1B tokens (6 dec)
// graduation when real SOL in curve ~ 69 SOL
const GRADUATION_REAL_SOL: u64 = 69_000_000_000;

// ─── Program ─────────────────────────────────────────────────────────────────
#[program]
pub mod neet_pad {
    use super::*;

    /// One-time platform initialisation.
    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
        neet_mint: Pubkey,
    ) -> Result<()> {
        let state = &mut ctx.accounts.platform_state;
        state.authority    = ctx.accounts.authority.key();
        state.treasury     = treasury;
        state.neet_mint    = neet_mint;
        state.total_raised = 0;
        state.bump         = ctx.bumps.platform_state;
        Ok(())
    }

    /// Create a new bonding curve token.
    /// The `mint` keypair MUST be a vanity address ending in "neet" (verified off-chain
    /// via the grinder script before this tx is sent).
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,   // IPFS metadata URI
    ) -> Result<()> {
        require!(name.len() <= 32,   CustomError::NameTooLong);
        require!(symbol.len() <= 10, CustomError::SymbolTooLong);
        require!(uri.len() <= 200,   CustomError::UriTooLong);

        // Collect launch fee in SOL
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to:   ctx.accounts.treasury.to_account_info(),
                },
            ),
            LAUNCH_FEE_LAMPORTS,
        )?;

        // Collect 500 NEET fee
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.creator_neet_ata.to_account_info(),
                    to:        ctx.accounts.treasury_neet_ata.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            LAUNCH_FEE_NEET,
        )?;

        // Initialise curve state
        let curve = &mut ctx.accounts.bonding_curve;
        curve.creator              = ctx.accounts.creator.key();
        curve.mint                 = ctx.accounts.mint.key();
        curve.virtual_sol_reserves = VIRTUAL_SOL_RESERVES;
        curve.virtual_tok_reserves = VIRTUAL_TOKEN_RESERVES;
        curve.real_sol_reserves    = 0;
        curve.real_tok_reserves    = TOKEN_TOTAL_SUPPLY;
        curve.total_supply         = TOKEN_TOTAL_SUPPLY;
        curve.graduated            = false;
        curve.bump                 = ctx.bumps.bonding_curve;

        // Mint full supply to the curve vault
        let seeds: &[&[&[u8]]] = &[&[
            b"bonding_curve",
            ctx.accounts.mint.key().as_ref(),
            &[curve.bump],
        ]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint:      ctx.accounts.mint.to_account_info(),
                    to:        ctx.accounts.curve_token_vault.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                seeds,
            ),
            TOKEN_TOTAL_SUPPLY,
        )?;

        emit!(TokenCreated {
            mint:    ctx.accounts.mint.key(),
            creator: ctx.accounts.creator.key(),
            name:    name.clone(),
            symbol:  symbol.clone(),
            uri,
        });
        Ok(())
    }

    /// Buy tokens from the bonding curve.
    pub fn buy(ctx: Context<Buy>, sol_in: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.graduated, CustomError::AlreadyGraduated);
        require!(sol_in > 0, CustomError::ZeroAmount);

        // ── fee: 0.5% ────────────────────────────────────────────────────────
        let fee      = sol_in * TRADING_FEE_BPS / 10_000;
        let sol_net  = sol_in - fee;

        // ── constant-product bonding curve: (vS + r)(vT - t) = k ────────────
        let k        = (curve.virtual_sol_reserves + curve.real_sol_reserves)
                         .checked_mul(curve.virtual_tok_reserves + curve.real_tok_reserves)
                         .ok_or(CustomError::MathOverflow)?;
        let new_sol  = curve.virtual_sol_reserves + curve.real_sol_reserves + sol_net;
        let new_tok  = k / new_sol;
        let tok_out  = (curve.virtual_tok_reserves + curve.real_tok_reserves)
                         .checked_sub(new_tok)
                         .ok_or(CustomError::MathOverflow)?;

        require!(tok_out >= min_tokens_out, CustomError::SlippageExceeded);
        require!(tok_out <= curve.real_tok_reserves, CustomError::InsufficientLiquidity);

        // ── transfer SOL in ──────────────────────────────────────────────────
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.curve_sol_vault.to_account_info(),
                },
            ),
            sol_net,
        )?;
        // fee to treasury
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to:   ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;

        // ── transfer tokens out ──────────────────────────────────────────────
        let seeds: &[&[&[u8]]] = &[&[
            b"bonding_curve",
            ctx.accounts.mint.key().as_ref(),
            &[curve.bump],
        ]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.curve_token_vault.to_account_info(),
                    to:        ctx.accounts.buyer_token_ata.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                seeds,
            ),
            tok_out,
        )?;

        // ── update state ─────────────────────────────────────────────────────
        curve.real_sol_reserves += sol_net;
        curve.real_tok_reserves -= tok_out;

        emit!(Trade {
            mint: ctx.accounts.mint.key(),
            user: ctx.accounts.buyer.key(),
            is_buy: true,
            sol_amount: sol_in,
            token_amount: tok_out,
            real_sol_reserves: curve.real_sol_reserves,
        });

        // ── auto-graduate? ───────────────────────────────────────────────────
        if curve.real_sol_reserves >= GRADUATION_REAL_SOL {
            curve.graduated = true;
            emit!(Graduated { mint: ctx.accounts.mint.key(), real_sol: curve.real_sol_reserves });
        }

        Ok(())
    }

    /// Sell tokens back to the bonding curve.
    pub fn sell(ctx: Context<Sell>, tok_in: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.graduated, CustomError::AlreadyGraduated);
        require!(tok_in > 0, CustomError::ZeroAmount);

        // ── constant-product ─────────────────────────────────────────────────
        let k       = (curve.virtual_sol_reserves + curve.real_sol_reserves)
                        .checked_mul(curve.virtual_tok_reserves + curve.real_tok_reserves)
                        .ok_or(CustomError::MathOverflow)?;
        let new_tok = curve.virtual_tok_reserves + curve.real_tok_reserves + tok_in;
        let new_sol = k / new_tok;
        let sol_out = (curve.virtual_sol_reserves + curve.real_sol_reserves)
                        .checked_sub(new_sol)
                        .ok_or(CustomError::MathOverflow)?;

        // ── fee ──────────────────────────────────────────────────────────────
        let fee     = sol_out * TRADING_FEE_BPS / 10_000;
        let sol_net = sol_out - fee;
        require!(sol_net >= min_sol_out, CustomError::SlippageExceeded);
        require!(sol_out <= curve.real_sol_reserves, CustomError::InsufficientLiquidity);

        // ── transfer tokens in ───────────────────────────────────────────────
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.seller_token_ata.to_account_info(),
                    to:        ctx.accounts.curve_token_vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            tok_in,
        )?;

        // ── transfer SOL out ─────────────────────────────────────────────────
        **ctx.accounts.curve_sol_vault.try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.seller.try_borrow_mut_lamports()? += sol_net;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee;

        // ── update state ─────────────────────────────────────────────────────
        curve.real_sol_reserves -= sol_out;
        curve.real_tok_reserves += tok_in;

        emit!(Trade {
            mint: ctx.accounts.mint.key(),
            user: ctx.accounts.seller.key(),
            is_buy: false,
            sol_amount: sol_net,
            token_amount: tok_in,
            real_sol_reserves: curve.real_sol_reserves,
        });

        Ok(())
    }

    /// Graduate to Raydium when bonding curve is full.
    /// Collects 1 SOL graduation fee and seeds the Raydium pool.
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        require!(curve.graduated, CustomError::NotReadyToGraduate);

        // Collect 1 SOL graduation fee
        **ctx.accounts.curve_sol_vault.try_borrow_mut_lamports()? -= GRADUATION_LAMPORTS;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += GRADUATION_LAMPORTS;

        emit!(Graduated {
            mint: ctx.accounts.mint.key(),
            real_sol: curve.real_sol_reserves,
        });
        Ok(())
    }
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer  = authority,
        space  = 8 + PlatformState::LEN,
        seeds  = [b"platform"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub authority:      Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The mint keypair MUST be a "...neet" vanity address — verified by UI before signing.
    #[account(
        init,
        payer  = creator,
        mint::decimals  = 6,
        mint::authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer  = creator,
        space  = 8 + BondingCurve::LEN,
        seeds  = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// Curve's token vault (holds all tokens for sale)
    #[account(
        init,
        payer             = creator,
        associated_token::mint      = mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    /// Curve's SOL vault (native lamports accumulate here)
    /// CHECK: This is a raw lamport account controlled by the program
    #[account(
        mut,
        seeds = [b"sol_vault", mint.key().as_ref()],
        bump,
    )]
    pub curve_sol_vault: UncheckedAccount<'info>,

    /// CHECK: treasury wallet address stored in platform_state
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub creator_neet_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_neet_ata: Account<'info, TokenAccount>,

    #[account(seeds = [b"platform"], bump = platform_state.bump)]
    pub platform_state: Account<'info, PlatformState>,

    pub token_program:         Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program:        Program<'info, System>,
    pub rent:                  Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump  = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = bonding_curve)]
    pub curve_token_vault: Account<'info, TokenAccount>,

    /// CHECK: sol vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub curve_sol_vault: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint      = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    /// CHECK: treasury
    pub treasury: UncheckedAccount<'info>,

    pub token_program:            Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program:           Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump  = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = bonding_curve)]
    pub curve_token_vault: Account<'info, TokenAccount>,

    /// CHECK: sol vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub curve_sol_vault: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = seller)]
    pub seller_token_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    /// CHECK: treasury
    pub treasury: UncheckedAccount<'info>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(mut, seeds = [b"bonding_curve", mint.key().as_ref()], bump = bonding_curve.bump)]
    pub bonding_curve: Account<'info, BondingCurve>,
    pub mint: Account<'info, Mint>,
    /// CHECK: sol vault
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub curve_sol_vault: UncheckedAccount<'info>,
    /// CHECK: treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct PlatformState {
    pub authority:     Pubkey, // 32
    pub treasury:      Pubkey, // 32
    pub neet_mint:     Pubkey, // 32
    pub total_raised:  u64,    // 8
    pub bump:          u8,     // 1
}
impl PlatformState { pub const LEN: usize = 32 + 32 + 32 + 8 + 1; }

#[account]
pub struct BondingCurve {
    pub creator:              Pubkey, // 32
    pub mint:                 Pubkey, // 32
    pub virtual_sol_reserves: u64,    // 8
    pub virtual_tok_reserves: u64,    // 8
    pub real_sol_reserves:    u64,    // 8
    pub real_tok_reserves:    u64,    // 8
    pub total_supply:         u64,    // 8
    pub graduated:            bool,   // 1
    pub bump:                 u8,     // 1
}
impl BondingCurve { pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1; }

// ─── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct TokenCreated { pub mint: Pubkey, pub creator: Pubkey, pub name: String, pub symbol: String, pub uri: String }
#[event]
pub struct Trade { pub mint: Pubkey, pub user: Pubkey, pub is_buy: bool, pub sol_amount: u64, pub token_amount: u64, pub real_sol_reserves: u64 }
#[event]
pub struct Graduated { pub mint: Pubkey, pub real_sol: u64 }

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum CustomError {
    #[msg("Name must be ≤ 32 chars")]     NameTooLong,
    #[msg("Symbol must be ≤ 10 chars")]   SymbolTooLong,
    #[msg("URI must be ≤ 200 chars")]     UriTooLong,
    #[msg("Token has already graduated")] AlreadyGraduated,
    #[msg("Token not ready to graduate")] NotReadyToGraduate,
    #[msg("Amount must be > 0")]          ZeroAmount,
    #[msg("Slippage tolerance exceeded")] SlippageExceeded,
    #[msg("Insufficient curve liquidity")]InsufficientLiquidity,
    #[msg("Math overflow")]               MathOverflow,
}
