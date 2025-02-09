import { useState, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  useToast,
  Input,
} from "@chakra-ui/react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

export const PdfUploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const currentAccount = useCurrentAccount();
  const toast = useToast();

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [toast],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // TODO: Implement the actual upload logic here
    // This is where you would handle the file upload to your backend or storage
    toast({
      title: "Upload successful",
      description: `Uploaded ${selectedFile.name}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }, [selectedFile, toast]);

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Heading textAlign="center">PDF Upload</Heading>

        {!currentAccount?.address ? (
          <Box textAlign="center">
            <Text mb={4}>Please connect your wallet to upload PDFs</Text>
            <ConnectButton />
          </Box>
        ) : (
          <VStack spacing={4}>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              sx={{
                "::file-selector-button": {
                  height: 10,
                  padding: "0 20px",
                  background: "gray.100",
                  border: "none",
                  borderRadius: "md",
                  marginRight: 4,
                  cursor: "pointer",
                },
              }}
            />
            {selectedFile && <Text>Selected file: {selectedFile.name}</Text>}
            <Button
              colorScheme="blue"
              onClick={handleUpload}
              isDisabled={!selectedFile}
              w="full"
            >
              Upload PDF
            </Button>
          </VStack>
        )}
      </VStack>
    </Container>
  );
};
