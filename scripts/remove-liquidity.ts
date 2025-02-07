import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';

dotenv.config();

const {
  VITE_AIXCOM_PACKAGE_ID,
  VITE_SWAP_POOL_ID,
  WALLET_PRIVATE_KEY,
} = process.env;

async function main() {
  // Initialize the Sui client and keypair
  const client = new SuiClient({ url: getFullnodeUrl('devnet') });
  const privateKeyArray = fromB64(WALLET_PRIVATE_KEY!);
  const keypair = Ed25519Keypair.fromSecretKey(privateKeyArray.slice(1));
  const address = keypair.getPublicKey().toSuiAddress();

  console.log('Found matching keypair for active address');

  // Create transaction block
  const tx = new Transaction();

  // Get pool data to calculate minimum amounts
  const poolObject = await client.getObject({
    id: VITE_SWAP_POOL_ID!,
    options: { showContent: true }
  });

  const poolData = (poolObject.data?.content as any)?.fields;
  const suiReserve = BigInt(poolData.sui_reserve);
  const aixcomReserve = BigInt(poolData.aixcom_reserve);
  const lpSupply = BigInt(poolData.lp_supply);

  // Calculate amounts for removing half of the liquidity
  const lpAmount = lpSupply / 2n; // Remove half of the liquidity
  const minSuiOut = suiReserve * lpAmount / lpSupply;
  const minAixcomOut = aixcomReserve * lpAmount / lpSupply;

  console.log('Removing liquidity...');
  console.log('LP Amount:', lpAmount.toString());
  console.log('Minimum SUI Out:', minSuiOut.toString());
  console.log('Minimum AIXCOM Out:', minAixcomOut.toString());

  // Add remove liquidity call
  tx.moveCall({
    target: `${VITE_AIXCOM_PACKAGE_ID}::swap::remove_liquidity`,
    arguments: [
      tx.object(VITE_SWAP_POOL_ID!),
      tx.pure.string(lpAmount.toString()),
      tx.pure.string(minSuiOut.toString()),
      tx.pure.string(minAixcomOut.toString()),
      tx.pure.string(address)
    ]
  });

  // Sign and execute the transaction
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log('Transaction successful:', result.digest);
  console.log('Liquidity removed successfully!');
}

main().catch(console.error);
