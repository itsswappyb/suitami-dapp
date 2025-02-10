import { Box, Flex, Link as ChakraLink, Spacer } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { ConnectButton } from '@mysten/dapp-kit';

export const Navigation = () => {
  return (
    <Box px={4} py={4}>
      <Flex maxW="container.lg" mx="auto" align="center" gap={6}>
        <ChakraLink as={RouterLink} to="/" fontWeight="bold">
          Home
        </ChakraLink>
        <ChakraLink as={RouterLink} to="/upload-pdf">
          Upload PDF
        </ChakraLink>
        <Spacer />
        <ConnectButton />
      </Flex>
    </Box>
  );
};
