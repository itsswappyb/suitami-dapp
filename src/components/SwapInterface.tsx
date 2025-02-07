import { useState, useEffect } from 'react';
// import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Transaction } from '@mysten/sui/transactions';
import {
  Box,
  Button,
  Text,
  VStack,
  Input,
  useToast,
  Flex,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  HStack,
  Tooltip,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { AIXCOM_PACKAGE_ID, TOKEN_DECIMALS, SWAP_POOL_ID } from '../constants/token';
import { useSwapPool } from '../hooks/useSwapPool';

export function SwapInterface() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { reserves, isLoading: isLoadingPool, calculateSuiToAixcom, refreshReserves } = useSwapPool();
  
  const [suiAmount, setSuiAmount] = useState('0.01');
  const [aixcomAmount, setAixcomAmount] = useState('10');
  const [balance, setBalance] = useState({ sui: '0', aixcom: '0' });
  const [isSwapping, setIsSwapping] = useState(false);
  // Always using fixed rate swap
  const isFixedRateSwap = true;
  const [slippage] = useState(0.5); // 0.5% slippage tolerance
  const [priceImpact, setPriceImpact] = useState(0);
  const toast = useToast();

  const updateBalance = async () => {
    if (!currentAccount?.address) return;
    
    try {
      // Fetch SUI balance
      const suiBalance = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: '0x2::sui::SUI'
      });
      
      // Fetch AIXCOM balance
      const aixcomBalance = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: `${AIXCOM_PACKAGE_ID}::aixcom::AIXCOM`
      });
      
      setBalance({
        sui: (Number(suiBalance.totalBalance) / 1e9).toFixed(2),
        aixcom: (Number(aixcomBalance.totalBalance || 0) / Math.pow(10, TOKEN_DECIMALS)).toFixed(2)
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      updateBalance();
    }
  }, [currentAccount?.address]);

  const handleFixedRateSwap = async () => {
    if (!currentAccount || !signAndExecuteTransaction) return;

    try {
      setIsSwapping(true);

      const tx = new Transaction() as any;
      
      // Fixed amounts: 0.01 SUI for 10 AIXCOM
      const FIXED_SUI_AMOUNT = 10_000_000; // 0.01 SUI in Mist

      // Split SUI from gas coin
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(FIXED_SUI_AMOUNT)]);

      // Add swap call
      tx.moveCall({
        target: `${AIXCOM_PACKAGE_ID}::swap::swap_sui_fixed_rate`,
        arguments: [
          tx.object(SWAP_POOL_ID),
          coin,
          tx.pure.address(currentAccount.address)
        ]
      });

      signAndExecuteTransaction(
        {
          transaction: tx
        },
        {
          onSuccess: async (result) => {
            console.log('Transaction success:', result);
            setIsSwapping(false);
            // Refresh balances after swap
            // updateBalance();
            await Promise.all([updateBalance(), refreshReserves()]);
          },
          onError: (error) => {
            console.log('Transaction Error:', error);
            setIsSwapping(false);
          }
        }
      );
    } catch (error) {
      console.error('Error during swap:', error);
      setIsSwapping(false);
    }
  };

  const handleVariableRateSwap = async () => {
    if (!currentAccount?.address) {
      toast({
        title: 'Please connect your wallet',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsSwapping(true);

      // Convert amounts to smallest units
      const suiAmountInMist = Math.floor(Number(suiAmount) * 1e9);
      const minAixcomOut = Math.floor(
        Number(aixcomAmount) * 
        Math.pow(10, TOKEN_DECIMALS) * 
        (1 - slippage / 100)
      );

      // Create transaction block
      const tx = new Transaction() as any;
      console.log('tx.gas', tx.gas);
      
      // Split SUI from gas coin
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmountInMist)]);

      console.log({AIXCOM_PACKAGE_ID, SWAP_POOL_ID, coin, minAixcomOut, recipient: currentAccount.address, suiAmountInMist});

      // Add swap call
      tx.moveCall({
        target: `${AIXCOM_PACKAGE_ID}::swap::swap_sui_for_aixcom`,
        arguments: [
          tx.object(SWAP_POOL_ID),
          coin,
          tx.pure.u64(995),
          tx.pure.address(currentAccount.address)
        ]
      });

      // Sign and execute the transaction with the connected wallet
      // const response = await signAndExecuteTransaction({
      //   transactionBlock: tx,
      //   options: {
      //     showEffects: true,
      //     showEvents: true,
      //   },
      // });

      signAndExecuteTransaction(
        {
          transaction: tx
        },
        {
          onSuccess: async (result) => {
            console.log('Transaction success:', result);
            await Promise.all([updateBalance(), refreshReserves()]);
            setIsSwapping(false);
          },
          onError: (error) => {
            console.log('Transaction Error:', error);
            setIsSwapping(false);
          }
        }
      );
      
      // toast({
      //   title: 'Swap successful!',
      //   description: `Transaction hash: ${response.digest}`,
      //   status: 'success',
      //   duration: 5000,
      // });

      // Refresh balances and pool data
      // await Promise.all([updateBalance(), refreshReserves()]);
      // setIsSwapping(false);
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: 'Swap failed',
        description: error.message || 'Transaction failed. Please try again.',
        status: 'error',
        duration: 5000,
      });
      setIsSwapping(false);
    }
  };

  const handleSuiInputChange = (value: string) => {
    setSuiAmount(value);
    const numValue = Number(value);
    
    if (numValue > 0) {
      const { outputAmount, priceImpact: impact } = calculateSuiToAixcom(numValue);
      setAixcomAmount(outputAmount.toFixed(2));
      setPriceImpact(impact);
    } else {
      setAixcomAmount('0');
      setPriceImpact(0);
    }
  };

  return (
    <Box
      maxW="480px"
      mx="auto"
      p={8}
      borderRadius="2xl"
      bg="whiteAlpha.200"
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor="whiteAlpha.300"
    >
      <VStack spacing={6}>
        <Heading size="lg" color="white">Fixed Rate Swap</Heading>
        
        <StatGroup width="100%" bg="whiteAlpha.100" p={4} borderRadius="xl">
          <Stat>
            <StatLabel color="whiteAlpha.700">SUI Balance</StatLabel>
            <StatNumber color="white">{balance.sui} SUI</StatNumber>
          </Stat>
          <Stat>
            <StatLabel color="whiteAlpha.700">AIXCOM Balance</StatLabel>
            <StatNumber color="white">{balance.aixcom} AIXCOM</StatNumber>
          </Stat>
        </StatGroup>

        <Box width="100%" bg="whiteAlpha.100" p={4} borderRadius="xl">
          <Flex justify="space-between" align="center" mb={2}>
            <Text color="whiteAlpha.700">Pool Liquidity</Text>
            <IconButton
              aria-label="Refresh pool data"
              icon={isLoadingPool ? <Spinner size="sm" /> : <RepeatIcon />}
              size="sm"
              variant="ghost"
              onClick={refreshReserves}
              isDisabled={isLoadingPool}
            />
          </Flex>
          <HStack spacing={4} justify="space-between">
            <Text color="white">{reserves.suiReserve.toFixed(2)} SUI</Text>
            <Text color="white">{reserves.aixcomReserve.toFixed(2)} AIXCOM</Text>
          </HStack>
        </Box>

        <Box width="100%">
          <Text mb={2} color="whiteAlpha.700">You pay</Text>
          <Flex>
            <Input
              value={suiAmount}
              onChange={(e) => handleSuiInputChange(e.target.value)}
              placeholder="0.0"
              type="number"
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.300"
              color="white"
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{ borderColor: "blue.300" }}
            />
            <Text ml={2} alignSelf="center" color="white">SUI</Text>
          </Flex>
        </Box>

        <Box width="100%">
          <Text mb={2} color="whiteAlpha.700">You receive</Text>
          <Flex>
            <Input
              value={aixcomAmount}
              isReadOnly
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.300"
              color="white"
            />
            <Text ml={2} alignSelf="center" color="white">AIXCOM</Text>
          </Flex>
        </Box>

        <Box width="100%" bg="whiteAlpha.50" p={4} borderRadius="xl">
          <VStack spacing={2} align="stretch">
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Price Impact</Text>
              <Tooltip label="The difference between the current market price and the price you'll get due to the size of your trade.">
                <Text
                  color={priceImpact > 5 ? 'red.300' : priceImpact > 2 ? 'yellow.300' : 'green.300'}
                >
                  {priceImpact.toFixed(2)}%
                </Text>
              </Tooltip>
            </Flex>
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Slippage Tolerance</Text>
              <Text color="white">{slippage}%</Text>
            </Flex>
          </VStack>
        </Box>

        <Box width="100%">
          <Button
            width="100%"
            colorScheme="blue"
            size="lg"
            onClick={isFixedRateSwap ? handleFixedRateSwap : handleVariableRateSwap}
            isLoading={isSwapping}
            loadingText="Swapping..."
            isDisabled={!currentAccount}
          >
            {!currentAccount ? 'Connect Wallet to Swap' : 'Buy 10 AIXCOM for 0.01 SUI'}
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}
