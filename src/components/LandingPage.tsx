import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Image,
  Button,
  Link
} from '@chakra-ui/react';
import { FiTwitter } from 'react-icons/fi';
import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { SwapModal } from './SwapModal';
import { RegisterModal } from './RegisterModal';
import { useState, useEffect } from 'react';
import { getAixcomBalance } from '../utils/tokenUtils';
import { getRegistrationCount } from '../services/registrationService';

export function LandingPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [hasEnoughTokens, setHasEnoughTokens] = useState(false);
  const [aixcomBalance, setAixcomBalance] = useState<number>(0);
  const [registrationCount, setRegistrationCount] = useState<number>(0);
  
  // Fetch registration count
  useEffect(() => {
    async function fetchCount() {
      const count = await getRegistrationCount();
      setRegistrationCount(count);
    }
    fetchCount();

    // Refresh count every minute
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkBalance() {
      if (!currentAccount?.address) {
        setHasEnoughTokens(false);
        return;
      }

      const packageId = import.meta.env.VITE_AIXCOM_PACKAGE_ID;
      console.log('Package ID:', packageId); // Debug log
      const coinType = `${packageId}::aixcom::AIXCOM`;
      try {
        const balance = await getAixcomBalance(suiClient, currentAccount.address, coinType);
        console.log('Current AIXCOM balance:', balance); // Debug log
        setAixcomBalance(balance);
        setHasEnoughTokens(balance >= 10);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setAixcomBalance(0);
        setHasEnoughTokens(false);
      }
    }

    checkBalance();
  }, [currentAccount, suiClient]);
  
  const handleOpenSwapModal = () => setIsSwapModalOpen(true);
  const handleCloseSwapModal = () => setIsSwapModalOpen(false);
  
  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  return (
    <Box
      minH="100vh"
      bg="gray.800"
      position="relative"
      sx={{
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }
      }}
    >
      <Box position="absolute" top={4} right={4}>
        <ConnectButton />
      </Box>
      <Container maxW="container.xl" pt={10} pb={10}>
        <VStack spacing={8} align="center">
          {/* Logo */}
          <Box w="200px" h="200px">
            <Image
              src="/suitami-logo.jpg"
              alt="Suitami Logo"
              w="100%"
              h="100%"
              objectFit="contain"
              borderRadius="full"
              border="2px solid"
              borderColor="whiteAlpha.200"
            />
          </Box>
          {/* Main Heading */}
          <Heading
            as="h1"
            size="2xl"
            textAlign="center"
            color="white"
            fontFamily="monospace"
            letterSpacing="wide"
          >
            COMING SOON
          </Heading>

          {/* Buttons Section */}
          <HStack spacing={4} pt={4}>
            <Button
              size="lg"
              bg="black"
              color="white"
              px={8}
              py={6}
              _hover={{ bg: 'gray.800' }}
              borderRadius="md"
              border="2px solid"
              borderColor="cyan.400"
              onClick={handleOpenRegisterModal}
              isDisabled={!hasEnoughTokens || !currentAccount}
            >
              REGISTER
            </Button>
            <Button
              size="lg"
              bg="black"
              color="white"
              px={8}
              py={6}
              _hover={{ bg: 'gray.800' }}
              borderRadius="md"
              border="2px solid"
              borderColor="yellow.400"
              onClick={handleOpenSwapModal}
            >
              GET AIXCOM
            </Button>
          </HStack>

          {/* AIXCOM Balance */}
          {currentAccount && (
            <Text color="white" fontSize="sm" textAlign="center">
              Your Balance: <Text as="span" color="cyan.400" fontWeight="bold">{aixcomBalance.toFixed(2)} AIXCOM</Text>
            </Text>
          )}

          {/* Registration Info Message */}
          {!hasEnoughTokens && currentAccount && (
            <Text color="yellow.400" fontSize="sm" textAlign="center" maxW="md">
              You need at least 10 AIXCOM tokens to register. Click "GET AIXCOM" to purchase tokens.
            </Text>
          )}

          {/* Counter Text */}
          <Text color="gray.400" fontSize="lg" pt={4}>
            <Box as="span" color="pink.400" display="inline-block" mr={2}>●</Box>
            {registrationCount.toLocaleString()} Suitamers have already joined
          </Text>

          {/* Social Links Section */}
          <VStack spacing={4} pt={8}>
            <Heading color="white" size="lg" fontFamily="monospace">
              FOLLOW US ON
            </Heading>
            <Link href="https://x.com/suitami_AI" isExternal>
              <Button
                leftIcon={<Icon as={FiTwitter} />}
                bg="black"
                color="white"
                size="lg"
                _hover={{ bg: 'gray.800' }}
              >
                TWITTER
              </Button>
            </Link>
          </VStack>

          {/* Swap Modal */}
          <SwapModal isOpen={isSwapModalOpen} onClose={handleCloseSwapModal} />
          <RegisterModal isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} />
        </VStack>
      </Container>
    </Box>
  );
}
