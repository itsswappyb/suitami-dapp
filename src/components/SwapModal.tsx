import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Box,
  useToast,
} from '@chakra-ui/react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useState } from 'react';
import { createSwapTransaction } from '../utils/swapUtils';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const currentAccount = useCurrentAccount();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const handleSwap = async () => {
    if (!currentAccount?.address) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const tx = createSwapTransaction(currentAccount.address);
      
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('Transaction success:', result);
            onClose();
            toast({
              title: 'Success',
              description: 'Successfully purchased AIXCOM tokens!',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          },
          onError: (error) => {
            console.log('Transaction Error:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to swap tokens',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
            onClose();
          }
        }
      );
    } catch (error) {
      console.error('Swap error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.800" color="white" borderRadius="xl">
        <ModalHeader textAlign="center" borderBottom="1px solid" borderColor="whiteAlpha.200">
          Get AIXCOM Tokens
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          <VStack spacing={6}>
            <Box
              w="full"
              p={4}
              bg="whiteAlpha.100"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text color="gray.400" mb={2}>You Pay</Text>
              <Text fontSize="xl" fontWeight="bold">0.01 SUI</Text>
            </Box>

            <Box
              w="full"
              p={4}
              bg="whiteAlpha.100"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Text color="gray.400" mb={2}>You Receive</Text>
              <Text fontSize="xl" fontWeight="bold">10 AIXCOM</Text>
            </Box>

            <Button
              w="full"
              colorScheme="blue"
              size="lg"
              onClick={handleSwap}
              isLoading={isLoading}
              loadingText="Buying AIXCOM..."
              disabled={!currentAccount}
            >
              {currentAccount ? 'Buy AIXCOM' : 'Connect Wallet to Buy'}
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
