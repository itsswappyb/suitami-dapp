import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiLock, FiTrendingUp, FiZap } from 'react-icons/fi';
import { ConnectButton } from '@mysten/dapp-kit';
import { SwapInterface } from './SwapInterface';

const Feature = ({ icon, title, text }: { icon: any; title: string; text: string }) => {
  return (
    <VStack
      align="start"
      bg="whiteAlpha.100"
      p={6}
      borderRadius="xl"
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      flex={1}
    >
      <Icon as={icon} w={6} h={6} color="blue.400" />
      <Text fontWeight="bold" fontSize="xl" color="white">
        {title}
      </Text>
      <Text color="whiteAlpha.800">{text}</Text>
    </VStack>
  );
};

export function LandingPage() {
  return (
    <Box
      minH="100vh"
      bg="gray.900"
      backgroundImage="radial-gradient(circle at 50% 50%, rgba(20, 80, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)"
      position="relative"
    >
      <Box position="absolute" top={4} right={4}>
        <ConnectButton />
      </Box>
      <Container maxW="container.xl" pt={20} pb={20}>
        <VStack spacing={16}>
          {/* Hero Section */}
          <VStack spacing={6} textAlign="center" maxW="800px">
            <Heading
              as="h1"
              size="2xl"
              bgGradient="linear(to-r, blue.400, purple.400)"
              bgClip="text"
              letterSpacing="tight"
            >
              AIXCOM Token
            </Heading>
            <Text fontSize="xl" color="whiteAlpha.900">
              The native token for the AIXCOM AI Agent ecosystem. Secure, efficient, and built on Sui.
            </Text>
          </VStack>

          {/* Features Section */}
          <HStack spacing={8} w="full" flexWrap={{ base: 'wrap', md: 'nowrap' }} gap={8}>
            <Feature
              icon={FiLock}
              title="Secure"
              text="Built on Sui blockchain with robust security features and audited smart contracts."
            />
            <Feature
              icon={FiTrendingUp}
              title="Scalable"
              text="Leveraging Sui's high-performance infrastructure for instant transactions."
            />
            <Feature
              icon={FiZap}
              title="Efficient"
              text="Low transaction fees and instant finality for seamless token swaps."
            />
          </HStack>

          {/* Swap Interface */}
          <Box w="full">
            <SwapInterface />
          </Box>

          {/* Token Info */}
          <VStack
            spacing={4}
            p={8}
            bg="whiteAlpha.100"
            borderRadius="2xl"
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor="whiteAlpha.200"
            w="full"
            maxW="800px"
          >
            <Heading size="lg" color="white">Token Information</Heading>
            <HStack spacing={8} flexWrap="wrap" justifyContent="center">
              <Box textAlign="center">
                <Text color="whiteAlpha.700">Token Name</Text>
                <Text color="white" fontSize="lg" fontWeight="bold">AIXCOM</Text>
              </Box>
              <Box textAlign="center">
                <Text color="whiteAlpha.700">Decimals</Text>
                <Text color="white" fontSize="lg" fontWeight="bold">9</Text>
              </Box>
              <Box textAlign="center">
                <Text color="whiteAlpha.700">Network</Text>
                <Text color="white" fontSize="lg" fontWeight="bold">Sui Mainnet</Text>
              </Box>
              <Box textAlign="center">
                <Text color="whiteAlpha.700">Exchange Rate</Text>
                <Text color="white" fontSize="lg" fontWeight="bold">1000 AIXCOM / 0.01 SUI</Text>
              </Box>
            </HStack>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
}
