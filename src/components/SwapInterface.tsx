import { useState, useEffect } from 'react';
import { TransactionBlock } from '@mysten/sui.js/transactions';
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
} from '@chakra-ui/react';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { AIXCOM_PACKAGE_ID, TOKEN_DECIMALS, TOKENS_PER_SUI, SWAP_POOL_ID } from '../constants/token';

export function SwapInterface() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [suiAmount, setSuiAmount] = useState('0.01');
  const [aixcomAmount, setAixcomAmount] = useState('1000');
  const [balance, setBalance] = useState({ sui: '0', aixcom: '0' });
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState(0.5); // 0.5% slippage tolerance
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

  const handleSwap = async () => {
    if (!currentAccount) {
      toast({
        title: 'Please connect your wallet',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsSwapping(true);
      const suiAmountInMist = Number(suiAmount) * 1e9;
      const aixcomAmountInSmallestUnit = Number(aixcomAmount) * Math.pow(10, TOKEN_DECIMALS);
      
      // Calculate minimum amount out with slippage tolerance
      const minAixcomOut = Math.floor(aixcomAmountInSmallestUnit * (1 - slippage / 100));

      const tx = new TransactionBlock();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(suiAmountInMist)]);
      
      tx.moveCall({
        target: `${AIXCOM_PACKAGE_ID}::swap::swap_sui_for_aixcom`,
        arguments: [
          tx.object(SWAP_POOL_ID),
          coin,
          tx.pure(minAixcomOut),
          tx.pure(currentAccount.address),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      toast({
        title: 'Swap successful!',
        description: `Txn hash: ${result.digest}`,
        status: 'success',
        duration: 5000,
      });

      updateBalance();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: 'Swap failed',
        description: error.message || 'Transaction failed. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSuiInputChange = (value: string) => {
    setSuiAmount(value);
    setAixcomAmount((Number(value) * TOKENS_PER_SUI).toString());
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
        <Heading size="lg" color="white">Swap SUI for AIXCOM</Heading>
        
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

        <Box width="100%">
          {!currentAccount ? (
            <ConnectButton 
              className="connect-button"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.1em',
                backgroundColor: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          ) : (
            <Button
              width="100%"
              colorScheme="blue"
              size="lg"
              onClick={handleSwap}
              isLoading={isSwapping}
              loadingText="Swapping..."
            >
              Swap
            </Button>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
