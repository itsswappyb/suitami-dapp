import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { SuiClient } from '@mysten/sui.js/client';

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

  // Get pool data
  const poolData = await client.getObject({
    id: VITE_SWAP_POOL_ID,
    options: { showContent: true }
  });

  if (!poolData.data?.content?.fields) {
    throw new Error('Could not fetch pool data');
  }

  const suiReserve = BigInt(poolData.data.content.fields.sui_reserve.fields.balance);
  console.log('Current SUI reserve:', suiReserve.toString());

  // Create transaction to remove all SUI liquidity
  const tx = new TransactionBlock();
  
  tx.moveCall({
    target: `${VITE_AIXCOM_PACKAGE_ID}::aixcom::remove_sui_liquidity`,
    arguments: [
      tx.object(VITE_SWAP_POOL_ID),
      tx.pure(suiReserve.toString()),
      tx.pure(VITE_WALLET_ADDRESS),
    ],
  });

  // Sign and execute transaction
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(WALLET_PRIVATE_KEY).slice(1));
  
  console.log('Executing transaction to remove all SUI liquidity...');
  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });

  console.log('Transaction successful:', result.digest);
  console.log('All SUI liquidity has been removed from the pool');
}

main().catch(console.error);
