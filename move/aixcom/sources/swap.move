module aixcom::swap {
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::event;
    use aixcom::aixcom::AIXCOM;

    /// Errors
    const EInsufficientLiquidity: u64 = 0;
    const EInsufficientAmount: u64 = 1;
    const EInsufficientOutputAmount: u64 = 2;
    const EInsufficientInputAmount: u64 = 3;
    const EInvalidZeroAmount: u64 = 4;

    /// The Pool object that holds both SUI and AIXCOM tokens
    struct Pool has key {
        id: UID,
        sui_reserve: Balance<SUI>,
        aixcom_reserve: Balance<AIXCOM>,
        lp_supply: u64,
    }

    /// LP tokens for liquidity providers
    struct LPToken has drop {}

    /// Events
    struct SwapEvent has copy, drop {
        sui_amount: u64,
        aixcom_amount: u64,
        sui_to_aixcom: bool,
    }

    /// Initialize the pool
    fun init(ctx: &mut TxContext) {
        let pool = Pool {
            id: object::new(ctx),
            sui_reserve: balance::zero(),
            aixcom_reserve: balance::zero(),
            lp_supply: 0,
        };
        transfer::share_object(pool);
    }

    /// Add liquidity to the pool
    public entry fun add_liquidity(
        pool: &mut Pool,
        sui_amount: Coin<SUI>,
        aixcom_amount: Coin<AIXCOM>,
        ctx: &mut TxContext
    ) {
        let sui_value = coin::value(&sui_amount);
        let aixcom_value = coin::value(&aixcom_amount);

        assert!(sui_value > 0 && aixcom_value > 0, EInvalidZeroAmount);

        // Transfer tokens to pool
        balance::join(&mut pool.sui_reserve, coin::into_balance(sui_amount));
        balance::join(&mut pool.aixcom_reserve, coin::into_balance(aixcom_amount));

        // Mint LP tokens (simplified version)
        pool.lp_supply = pool.lp_supply + (sui_value as u64);
    }

    /// Swap SUI for AIXCOM tokens
    public entry fun swap_sui_for_aixcom(
        pool: &mut Pool,
        sui_in: Coin<SUI>,
        min_aixcom_out: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let sui_amount = coin::value(&sui_in);
        assert!(sui_amount > 0, EInsufficientAmount);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let aixcom_reserve = balance::value(&pool.aixcom_reserve);

        // Calculate amount out using constant product formula (x * y = k)
        let aixcom_out = calculate_amount_out(sui_amount, sui_reserve, aixcom_reserve);
        assert!(aixcom_out >= min_aixcom_out, EInsufficientOutputAmount);

        // Update reserves
        balance::join(&mut pool.sui_reserve, coin::into_balance(sui_in));
        
        // Transfer AIXCOM tokens to recipient
        let aixcom_out_coin = coin::take(&mut pool.aixcom_reserve, aixcom_out, ctx);
        transfer::public_transfer(aixcom_out_coin, recipient);

        // Emit swap event
        event::emit(SwapEvent {
            sui_amount,
            aixcom_amount: aixcom_out,
            sui_to_aixcom: true,
        });
    }

    /// Swap AIXCOM for SUI tokens
    public entry fun swap_aixcom_for_sui(
        pool: &mut Pool,
        aixcom_in: Coin<AIXCOM>,
        min_sui_out: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let aixcom_amount = coin::value(&aixcom_in);
        assert!(aixcom_amount > 0, EInsufficientAmount);

        let sui_reserve = balance::value(&pool.sui_reserve);
        let aixcom_reserve = balance::value(&pool.aixcom_reserve);

        // Calculate amount out using constant product formula (x * y = k)
        let sui_out = calculate_amount_out(aixcom_amount, aixcom_reserve, sui_reserve);
        assert!(sui_out >= min_sui_out, EInsufficientOutputAmount);

        // Update reserves
        balance::join(&mut pool.aixcom_reserve, coin::into_balance(aixcom_in));
        
        // Transfer SUI tokens to recipient
        let sui_out_coin = coin::take(&mut pool.sui_reserve, sui_out, ctx);
        transfer::public_transfer(sui_out_coin, recipient);

        // Emit swap event
        event::emit(SwapEvent {
            sui_amount: sui_out,
            aixcom_amount,
            sui_to_aixcom: false,
        });
    }

    /// Calculate output amount based on constant product formula (x * y = k)
    fun calculate_amount_out(amount_in: u64, reserve_in: u64, reserve_out: u64): u64 {
        let amount_in_with_fee = (amount_in as u128) * 997; // 0.3% fee
        let numerator = amount_in_with_fee * (reserve_out as u128);
        let denominator = ((reserve_in as u128) * 1000) + amount_in_with_fee;
        ((numerator / denominator) as u64)
    }

    /// View functions
    public fun get_reserves(pool: &Pool): (u64, u64) {
        (
            balance::value(&pool.sui_reserve),
            balance::value(&pool.aixcom_reserve)
        )
    }

    public fun get_lp_supply(pool: &Pool): u64 {
        pool.lp_supply
    }
}
