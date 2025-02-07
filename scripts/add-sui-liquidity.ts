import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';

// Read environment variables
const {
  VITE_AIXCOM_PACKAGE_ID,
  VITE_SWAP_POOL_ID,
  WALLET_PRIVATE_KEY,
  VITE_WALLET_ADDRESS
} = process.env;

async function main() {
  if (!VITE_AIXCOM_PACKAGE_ID || !VITE_SWAP_POOL_ID || !WALLET_PRIVATE_KEY || !VITE_WALLET_ADDRESS) {
    throw new Error('Required environment variables are not set');
  }

  // Initialize Sui client
  const client = new SuiClient({ url: 'https://fullnode.devnet.sui.io:443' });

  // Create transaction to add SUI liquidity
  const tx = new Transaction();
  const suiAmount = 0.02 * 1e9; // 0.02 SUI
  console.log('SUI amount for liquidity:', suiAmount);

  const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmount)]);

  console.log('Adding SUI liquidity to pool...');
  tx.moveCall({
    target: `${VITE_AIXCOM_PACKAGE_ID}::swap::add_sui_liquidity`,
    arguments: [
      tx.object(VITE_SWAP_POOL_ID),
      suiCoin,
    ],
  });

  // Sign and execute transaction
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(WALLET_PRIVATE_KEY).slice(1));
  
  console.log('Executing transaction...');
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });

  console.log('Transaction successful:', result.digest);
  console.log('SUI liquidity has been added to the pool');
}

main().catch(console.error);
