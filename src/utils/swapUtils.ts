import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';

const FIXED_RATE_SUI_AMOUNT = 10_000_000; // 0.01 SUI in Mist

export async function handleFixedRateSwap(walletAddress: string) {
  const { VITE_AIXCOM_PACKAGE_ID, VITE_SWAP_POOL_ID } = process.env;

  if (!VITE_AIXCOM_PACKAGE_ID || !VITE_SWAP_POOL_ID) {
    throw new Error('Missing environment variables');
  }

  const tx = new Transaction();
  const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(FIXED_RATE_SUI_AMOUNT)]);

  tx.moveCall({
    target: `${VITE_AIXCOM_PACKAGE_ID}::swap::swap_sui_for_aixcom`,
    arguments: [
      tx.object(VITE_SWAP_POOL_ID),
      suiCoin,
      tx.pure.u64(0), // min_aixcom_out (0 for fixed rate)
      tx.pure.address(walletAddress),
    ],
  });

  return tx;
}
