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
  Progress,
  Spinner,
} from "@chakra-ui/react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

interface UploadResponse {
  message: string;
  file: {
    id: string;
    name: string;
    status: string;
    percent_done: number;
    signed_url: string;
    _id: string;
  };
  assistant: {
    _id: string;
    name: string;
    pineconeAssistantId: string;
  };
}

export const PdfUploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const currentAccount = useCurrentAccount();
  const toast = useToast();

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setSelectedFile(file);
        setUploadProgress(0); // Reset progress when new file is selected
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

  const pollUploadStatus = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/pinecone/files/${fileId}/status`);
      const data = await response.json();
      
      if (data.status === "Processing") {
        setUploadProgress(data.percent_done || 0);
        // Poll again in 2 seconds
        setTimeout(() => pollUploadStatus(fileId), 2000);
      } else if (data.status === "Completed") {
        setUploadProgress(100);
        setIsUploading(false);
        toast({
          title: "Processing complete",
          description: "Your PDF has been successfully processed",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else if (data.status === "Failed") {
        setIsUploading(false);
        toast({
          title: "Processing failed",
          description: data.error_message || "Failed to process the PDF",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error polling status:", error);
    }
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !currentAccount?.address) {
      toast({
        title: "Error",
        description: "Please select a PDF file and connect your wallet",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("walletAddress", currentAccount.address);

    try {
      const response = await fetch("/api/pinecone/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data: UploadResponse = await response.json();
      
      toast({
        title: "Upload successful",
        description: "Your PDF is being processed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Start polling for status
      pollUploadStatus(data.file._id);
      
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload PDF",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [selectedFile, currentAccount?.address, toast, pollUploadStatus]);

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Heading textAlign="center">Upload to Knowledge Base</Heading>
        <Text textAlign="center" color="gray.600">
          Upload PDFs to your personal knowledge base. Your assistant will be able to answer questions based on these documents.
        </Text>

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
              isDisabled={isUploading}
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
            
            {isUploading && (
              <Box w="100%">
                <Text mb={2} textAlign="center">
                  {uploadProgress < 100 
                    ? `Processing: ${Math.round(uploadProgress)}%`
                    : "Finalizing upload..."}
                </Text>
                <Progress 
                  value={uploadProgress} 
                  size="sm" 
                  colorScheme="blue" 
                  isAnimated
                />
              </Box>
            )}

            <Button
              colorScheme="blue"
              onClick={handleUpload}
              isDisabled={!selectedFile || isUploading}
              w="full"
            >
              {isUploading ? <Spinner size="sm" /> : "Upload PDF"}
            </Button>
          </VStack>
        )}
      </VStack>
    </Container>
  );
};
