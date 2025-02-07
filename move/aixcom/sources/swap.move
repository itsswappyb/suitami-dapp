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
    const EInvalidFixedAmount: u64 = 5;
    const EInsufficientLPTokens: u64 = 6;
    const EInsufficientSUIReserve: u64 = 7;
    
    /// Fixed rate constants (0.01 SUI = 10 AIXCOM)
    const FIXED_RATE_SUI_AMOUNT: u64 = 10_000_000; // 0.01 SUI in Mist
    const FIXED_RATE_AIXCOM_AMOUNT: u64 = 10_000_000_000; // 10 AIXCOM with 9 decimals

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

    /// Add SUI liquidity to the pool
    public entry fun add_sui_liquidity(
        pool: &mut Pool,
        sui_amount: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sui_value = coin::value(&sui_amount);
        assert!(sui_value > 0, EInvalidZeroAmount);

        // Transfer SUI to pool
        balance::join(&mut pool.sui_reserve, coin::into_balance(sui_amount));
    }

    /// Add AIXCOM liquidity to the pool
    public entry fun add_aixcom_liquidity(
        pool: &mut Pool,
        aixcom_amount: Coin<AIXCOM>,
        ctx: &mut TxContext
    ) {
        let aixcom_value = coin::value(&aixcom_amount);
        assert!(aixcom_value > 0, EInvalidZeroAmount);

        // Transfer AIXCOM to pool
        balance::join(&mut pool.aixcom_reserve, coin::into_balance(aixcom_amount));
    }

    /// Remove SUI liquidity from the pool
    public entry fun remove_sui_liquidity(
        pool: &mut Pool,
        sui_amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Verify pool has enough SUI
        let sui_reserve = balance::value(&pool.sui_reserve);
        assert!(sui_amount > 0 && sui_amount <= sui_reserve, EInsufficientSUIReserve);
        
        // Transfer SUI to recipient
        let sui_out = coin::take(&mut pool.sui_reserve, sui_amount, ctx);
        transfer::public_transfer(sui_out, recipient);
    }

    /// Remove AIXCOM liquidity from the pool
    public entry fun remove_aixcom_liquidity(
        pool: &mut Pool,
        aixcom_amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Verify pool has enough AIXCOM
        let aixcom_reserve = balance::value(&pool.aixcom_reserve);
        assert!(aixcom_amount > 0 && aixcom_amount <= aixcom_reserve, EInsufficientLiquidity);
        
        // Transfer AIXCOM to recipient
        let aixcom_out = coin::take(&mut pool.aixcom_reserve, aixcom_amount, ctx);
        transfer::public_transfer(aixcom_out, recipient);
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





    /// Swap a fixed amount of SUI for AIXCOM at a fixed rate
    /// Rate: 0.01 SUI = 10 AIXCOM
    public entry fun swap_sui_fixed_rate(
        pool: &mut Pool,
        sui_in: Coin<SUI>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let sui_amount = coin::value(&sui_in);
        
        // Verify the input amount matches our fixed rate
        assert!(sui_amount == FIXED_RATE_SUI_AMOUNT, EInvalidFixedAmount);
        
        // Verify pool has enough AIXCOM
        let aixcom_reserve = balance::value(&pool.aixcom_reserve);
        assert!(aixcom_reserve >= FIXED_RATE_AIXCOM_AMOUNT, EInsufficientLiquidity);
        
        // Update reserves
        balance::join(&mut pool.sui_reserve, coin::into_balance(sui_in));
        
        // Transfer AIXCOM tokens to recipient
        let aixcom_out_coin = coin::take(&mut pool.aixcom_reserve, FIXED_RATE_AIXCOM_AMOUNT, ctx);
        transfer::public_transfer(aixcom_out_coin, recipient);
        
        // Emit swap event
        event::emit(SwapEvent {
            sui_amount,
            aixcom_amount: FIXED_RATE_AIXCOM_AMOUNT,
            sui_to_aixcom: true
        });
    }
}
