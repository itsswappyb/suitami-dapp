import { Transaction } from '@mysten/sui/transactions';

const FIXED_RATE_SUI_AMOUNT = 10_000_000; // 0.01 SUI in Mist

export function createSwapTransaction(walletAddress: string) {
  const { VITE_AIXCOM_PACKAGE_ID, VITE_SWAP_POOL_ID } = import.meta.env;

  if (!VITE_AIXCOM_PACKAGE_ID || !VITE_SWAP_POOL_ID) {
    throw new Error('Missing environment variables');
  }

  const tx = new Transaction();
  const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(FIXED_RATE_SUI_AMOUNT)]);

  tx.moveCall({
    target: `${VITE_AIXCOM_PACKAGE_ID}::swap::swap_sui_fixed_rate`,
    arguments: [
      tx.object(VITE_SWAP_POOL_ID),
      suiCoin,
      tx.pure.address(walletAddress),
    ],
  });

  return tx;
}
