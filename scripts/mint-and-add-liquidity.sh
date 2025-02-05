#!/bin/bash

# Load environment variables
source .env

# Mint AIXCOM tokens
echo "Minting AIXCOM tokens..."
sui client call \
    --package $VITE_AIXCOM_PACKAGE_ID \
    --module aixcom \
    --function mint \
    --args $VITE_AIXCOM_TREASURY_CAP 1000000000000 $VITE_WALLET_ADDRESS \
    --gas-budget 10000000

# Get the minted coin ID (you'll need to implement this based on the mint transaction response)
# AIXCOM_COIN_ID=...

# Add liquidity to the pool
echo "Adding liquidity to the pool..."
sui client call \
    --package $VITE_AIXCOM_PACKAGE_ID \
    --module swap \
    --function add_liquidity \
    --args $VITE_SWAP_POOL_ID $SUI_COIN_ID $AIXCOM_COIN_ID \
    --gas-budget 10000000
