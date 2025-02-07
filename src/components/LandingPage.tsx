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
  Link,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { FiTwitter } from 'react-icons/fi';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { SwapModal } from './SwapModal';
import { TelegramRegistration } from './TelegramRegistration';
import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { checkAixcomBalance } from '../utils/tokenUtils';

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
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  
  const handleOpenSwapModal = () => setIsSwapModalOpen(true);
  const handleCloseSwapModal = () => setIsSwapModalOpen(false);

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
              disabled
            >
              JOIN (SOL / EVM)
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

          {/* Counter Text */}
          <Text color="gray.400" fontSize="lg" pt={4}>
            <Box as="span" color="pink.400" display="inline-block" mr={2}>●</Box>
            1,281,316 Printooors have already aped
          </Text>

          {/* Subtext */}
          <Text color="gray.500" fontSize="lg">
            Join for early access, boosted points, and community airdrop!
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
        </VStack>
      </Container>
    </Box>
  );
}
