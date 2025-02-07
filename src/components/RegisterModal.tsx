import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import { registerWallet, getRegistration } from '../services/registrationService';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [telegramHandle, setTelegramHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentAccount = useCurrentAccount();
  const toast = useToast();

  useEffect(() => {
    async function checkRegistration() {
      if (!currentAccount?.address) return;

      try {
        const registration = await getRegistration(currentAccount.address);
        if (registration) {
          setTelegramHandle(registration.telegramHandle);
        } else {
          setTelegramHandle('');
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    }

    checkRegistration();
  }, [currentAccount]);

  const handleRegister = async () => {
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

    if (!telegramHandle) {
      toast({
        title: 'Error',
        description: 'Please enter your Telegram handle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!telegramHandle.startsWith('@')) {
      toast({
        title: 'Error',
        description: 'Telegram handle must start with @',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await registerWallet(currentAccount.address, telegramHandle);

      toast({
        title: 'Success',
        description: 'Your Telegram handle has been registered successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to register',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="gray.800" color="white" borderRadius="xl">
        <ModalHeader textAlign="center" borderBottom="1px solid" borderColor="whiteAlpha.200">
          Register Telegram Handle
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          <VStack spacing={6}>
            <Text color="gray.400" fontSize="sm">
              Register your Telegram handle to participate in the community.
              Make sure to join our Telegram group first!
            </Text>

            <FormControl>
              <FormLabel color="gray.300">Telegram Handle</FormLabel>
              <Input
                placeholder="@yourusername"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'whiteAlpha.300' }}
                _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
              />
            </FormControl>

            <Button
              w="full"
              colorScheme="blue"
              onClick={handleRegister}
              isLoading={isLoading}
              loadingText="Registering..."
              disabled={!currentAccount}
            >
              {currentAccount ? 'Register' : 'Connect Wallet to Register'}
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
