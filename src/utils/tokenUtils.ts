import { SuiClient } from '@mysten/sui.js/client';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';

const AIXCOM_DECIMALS = 9;
const MIN_REQUIRED_TOKENS = 10;

export async function checkAixcomBalance(
  client: SuiClient,
  walletAddress: string,
  coinType: string
): Promise<boolean> {
  try {
    const { data: coins } = await client.getCoins({
      owner: walletAddress,
      coinType,
    });

    const totalBalance = coins.reduce(
      (sum, coin) => sum + BigInt(coin.balance),
      BigInt(0)
    );

    // Convert balance to tokens (considering decimals)
    const balanceInTokens = Number(totalBalance) / Math.pow(10, AIXCOM_DECIMALS);
    
    return balanceInTokens >= MIN_REQUIRED_TOKENS;
  } catch (error) {
    console.error('Error checking AIXCOM balance:', error);
    return false;
  }
}
