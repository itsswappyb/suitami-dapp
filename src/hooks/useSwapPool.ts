import { useEffect, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { AIXCOM_PACKAGE_ID, SWAP_POOL_ID, TOKEN_DECIMALS } from '../constants/token';

interface PoolReserves {
  suiReserve: number;
  aixcomReserve: number;
}

export function useSwapPool() {
  const suiClient = useSuiClient();
  const [reserves, setReserves] = useState<PoolReserves>({ suiReserve: 0, aixcomReserve: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolReserves = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const poolObject = await suiClient.getObject({
        id: SWAP_POOL_ID,
        options: {
          showContent: true,
        }
      });

      if (!poolObject.data?.content) {
        throw new Error('Pool not found');
      }

      const content = poolObject.data.content as any;
      if (content.fields) {
        const suiReserve = Number(content.fields.sui_reserve) / 1e9;
        const aixcomReserve = Number(content.fields.aixcom_reserve) / Math.pow(10, TOKEN_DECIMALS);
        
        setReserves({
          suiReserve,
          aixcomReserve,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pool reserves');
      console.error('Error fetching pool reserves:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate output amount based on input
  const calculateOutputAmount = (
    inputAmount: number,
    inputReserve: number,
    outputReserve: number
  ): number => {
    if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) return 0;

    const inputAmountWithFee = inputAmount * 997; // 0.3% fee
    const numerator = inputAmountWithFee * outputReserve;
    const denominator = (inputReserve * 1000) + inputAmountWithFee;
    
    return numerator / denominator;
  };

  // Get price impact percentage
  const getPriceImpact = (inputAmount: number, inputReserve: number, outputReserve: number): number => {
    if (inputAmount <= 0 || inputReserve <= 0 || outputReserve <= 0) return 0;
    
    const outputAmount = calculateOutputAmount(inputAmount, inputReserve, outputReserve);
    const currentPrice = outputReserve / inputReserve;
    const executionPrice = outputAmount / inputAmount;
    const impact = ((currentPrice - executionPrice) / currentPrice) * 100;
    
    return Math.max(0, impact);
  };

  // Calculate SUI to AIXCOM output
  const calculateSuiToAixcom = (suiAmount: number): {
    outputAmount: number;
    priceImpact: number;
    effectivePrice: number;
  } => {
    const outputAmount = calculateOutputAmount(
      suiAmount,
      reserves.suiReserve,
      reserves.aixcomReserve
    );

    const priceImpact = getPriceImpact(
      suiAmount,
      reserves.suiReserve,
      reserves.aixcomReserve
    );

    const effectivePrice = outputAmount / suiAmount;

    return {
      outputAmount,
      priceImpact,
      effectivePrice,
    };
  };

  useEffect(() => {
    fetchPoolReserves();
    
    // Set up polling to keep reserves updated
    const intervalId = setInterval(fetchPoolReserves, 10000); // Poll every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  return {
    reserves,
    isLoading,
    error,
    calculateSuiToAixcom,
    refreshReserves: fetchPoolReserves,
  };
}
