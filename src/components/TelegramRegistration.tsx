import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';

interface TelegramRegistrationProps {
  hasEnoughTokens: boolean;
}

export function TelegramRegistration({ hasEnoughTokens }: TelegramRegistrationProps) {
  const [telegramHandle, setTelegramHandle] = useState('');
  const currentAccount = useCurrentAccount();
  const toast = useToast();

  const handleRegistration = async () => {
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

    // TODO: Implement the actual registration logic here
    // This would involve calling your backend API to store the wallet-telegram mapping
    console.log('Registering:', {
      walletAddress: currentAccount?.address,
      telegramHandle,
    });

    toast({
      title: 'Registration Successful',
      description: 'Your Telegram handle has been registered',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (!hasEnoughTokens) {
    return (
      <Box
        p={6}
        bg="red.900"
        borderRadius="xl"
        border="1px solid"
        borderColor="red.500"
      >
        <Text color="white">
          You need at least 10 AIXCOM tokens to register your Telegram handle.
          Please acquire more tokens to continue.
        </Text>
      </Box>
    );
  }

  return (
    <VStack
      spacing={4}
      p={6}
      bg="whiteAlpha.100"
      borderRadius="xl"
      backdropFilter="blur(10px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <FormControl>
        <FormLabel color="white">Telegram Handle</FormLabel>
        <Input
          placeholder="@yourusername"
          value={telegramHandle}
          onChange={(e) => setTelegramHandle(e.target.value)}
          color="white"
          _placeholder={{ color: 'whiteAlpha.500' }}
        />
      </FormControl>
      <Button
        colorScheme="blue"
        onClick={handleRegistration}
        isDisabled={!currentAccount}
        w="full"
      >
        Register Telegram Handle
      </Button>
    </VStack>
  );
}
