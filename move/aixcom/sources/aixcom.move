module aixcom::aixcom {
    use std::option;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// The type identifier of AIXCOM coin
    struct AIXCOM has drop {}

    /// Module initializer is called once on module publish
    fun init(witness: AIXCOM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<AIXCOM>(
            witness, 
            9, // decimals
            b"AIXCOM", // symbol
            b"AIXCOM Token", // name
            b"AIXCOM token for the AIXCOM AI Agent", // description
            option::none(), // icon url
            ctx
        );
        // Transfer the treasury cap to the module publisher
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        // Freeze the metadata object
        transfer::public_freeze_object(metadata);
    }

    /// Manager can mint new coins
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<AIXCOM>, 
        amount: u64, 
        recipient: address,
        ctx: &mut TxContext
    ) {
        coin::mint_and_transfer(treasury_cap, amount, recipient, ctx);
    }

    /// Manager can burn coins
    public entry fun burn(
        treasury_cap: &mut TreasuryCap<AIXCOM>,
        coin: Coin<AIXCOM>
    ) {
        coin::burn(treasury_cap, coin);
    }
}
