import { Box, Flex, Link as ChakraLink } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

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
      </Flex>
    </Box>
  );
};
