const express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const fs = require("fs");
const Assistant = require("../models/Assistant");
const File = require("../models/File");

// Configure multer for file upload
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to get or create assistant
async function createAssistant(walletAddress, name) {
  try {
    // Create a simple alphanumeric name
    const assistantName = `assistant${walletAddress.slice(2, 8)}`;

    console.log("Creating or getting assistant with name:", assistantName);

    let response;
    let isNewAssistant = true;

    try {
      // Try to create a new assistant
      const requestBody = {
        name: assistantName,
        instructions:
          "You are a helpful assistant that answers questions based on the provided knowledge base.",
        region: "us",
      };

      console.log(
        "Creating new assistant. Request body:",
        JSON.stringify(requestBody, null, 2),
      );

      response = await axios.post(
        "https://api.pinecone.io/assistant/assistants",
        requestBody,
        {
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      // If assistant already exists (409), try to get it
      if (error.response?.status === 409) {
        console.log("Assistant already exists, fetching existing assistant...");
        response = await axios.get(
          `https://api.pinecone.io/assistant/assistants/${assistantName}`,
          {
            headers: {
              "Api-Key": process.env.PINECONE_API_KEY,
            },
          },
        );
        isNewAssistant = false;
      } else {
        throw error;
      }
    }

    console.log("Pinecone response:", JSON.stringify(response.data, null, 2));

    // For existing assistants, we'll use "us" as the default region since that's what we use for new ones
    const region = isNewAssistant ? response.data.region : "us";

    // Store assistant in our database
    const assistant = new Assistant({
      pineconeAssistantId: response.data.name,
      name: name || assistantName,
      instructions:
        response.data.instructions ||
        "You are a helpful assistant that answers questions based on the provided knowledge base.",
      region: region,
      host: response.data.host,
      createdBy: walletAddress.toLowerCase(),
      isActive: true,
    });

    try {
      await assistant.save();
    } catch (error) {
      // If the assistant already exists in our database, update it
      if (error.code === 11000) {
        console.log("Assistant exists in database, updating...");
        await Assistant.findOneAndUpdate(
          { pineconeAssistantId: response.data.name },
          {
            name: name || assistantName,
            instructions:
              response.data.instructions ||
              "You are a helpful assistant that answers questions based on the provided knowledge base.",
            region: region,
            host: response.data.host,
            isActive: true,
          },
          { new: true },
        );
      } else {
        throw error;
      }
    }

    return assistant;
  } catch (error) {
    console.error("Error creating/getting Pinecone assistant:", {
      error: error.response?.data || error.message,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw error;
  }
}

// Helper function to upload file to assistant
async function uploadFileToPinecone(assistant, uploadedFile) {
  try {
    // Create form data
    const formData = new FormData();
    formData.append("file", fs.createReadStream(uploadedFile.path), {
      filename: uploadedFile.originalname,
      contentType: uploadedFile.mimetype,
    });

    // Upload to Pinecone
    const pineconeResponse = await axios.post(
      `${assistant.host}/assistant/files/${assistant.pineconeAssistantId}`,
      formData,
      {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          ...formData.getHeaders(),
        },
      },
    );

    return pineconeResponse;
  } catch (error) {
    console.error(
      "Error uploading to Pinecone:",
      error.response?.data || error,
    );
    throw error;
  }
}

// Helper function to safely delete a file
const safeDeleteFile = (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Successfully deleted file:", filePath);
    } else {
      console.log("File does not exist:", filePath);
    }
  } catch (error) {
    console.error("Error deleting file:", filePath, error);
  }
};

// Get all assistants for a user
router.get("/assistants/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const assistants = await Assistant.find({
      createdBy: walletAddress.toLowerCase(),
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(assistants);
  } catch (error) {
    console.error("Error fetching assistants:", error);
    res.status(500).json({
      error: "Failed to fetch assistants",
    });
  }
});

// Create a Pinecone assistant
router.post("/assistants", async (req, res) => {
  try {
    const { name, instructions, region, walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    if (!process.env.PINECONE_API_KEY) {
      return res
        .status(400)
        .json({ error: "PINECONE_API_KEY is not configured" });
    }

    // Create assistant in Pinecone
    const pineconeResponse = await axios.post(
      "https://api.pinecone.io/assistant/assistants",
      {
        name,
        instructions,
        region,
      },
      {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    // Store assistant in our database
    const assistant = new Assistant({
      pineconeAssistantId: pineconeResponse.data.name,
      name,
      instructions,
      region,
      host: pineconeResponse.data.host,
      createdBy: walletAddress.toLowerCase(),
    });

    await assistant.save();

    res.status(201).json({
      message: "Assistant created successfully",
      assistant: {
        ...pineconeResponse.data,
        _id: assistant._id,
      },
    });
  } catch (error) {
    console.error(
      "Error creating Pinecone assistant:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to create Pinecone assistant",
    });
  }
});

// Upload file to assistant
router.post(
  "/assistants/:assistantId/files",
  upload.single("file"),
  async (req, res) => {
    try {
      const { assistantId } = req.params;
      const { walletAddress } = req.body;
      const uploadedFile = req.file;

      if (!walletAddress) {
        // Clean up uploaded file
        fs.unlinkSync(uploadedFile.path);
        return res.status(400).json({ error: "Wallet address is required" });
      }

      if (!uploadedFile) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Find the assistant
      const assistant = await Assistant.findOne({
        _id: assistantId,
        createdBy: walletAddress.toLowerCase(),
        isActive: true,
      });

      if (!assistant) {
        // Clean up uploaded file
        fs.unlinkSync(uploadedFile.path);
        return res.status(404).json({ error: "Assistant not found" });
      }

      // Upload to Pinecone
      const pineconeResponse = await uploadFileToPinecone(
        assistant,
        uploadedFile,
      );

      // Create file record in database
      const file = new File({
        pineconeFileId: pineconeResponse.data.id,
        name: uploadedFile.originalname,
        assistantId: assistant._id,
        status: pineconeResponse.data.status,
        percentDone: pineconeResponse.data.percent_done,
        signedUrl: pineconeResponse.data.signed_url,
        errorMessage: pineconeResponse.data.error_message,
        metadata: pineconeResponse.data.metadata,
        createdBy: walletAddress.toLowerCase(),
      });

      await file.save();

      // Clean up uploaded file
      fs.unlinkSync(uploadedFile.path);

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          ...pineconeResponse.data,
          _id: file._id,
        },
      });
    } catch (error) {
      // Clean up uploaded file if it exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      console.error(
        "Error uploading file:",
        error.response?.data || error.message,
      );
      res.status(error.response?.status || 500).json({
        error: error.response?.data || "Failed to upload file",
      });
    }
  },
);

// Get all files for an assistant
router.get("/assistants/:assistantId/files", async (req, res) => {
  try {
    const { assistantId } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Verify assistant ownership
    const assistant = await Assistant.findOne({
      _id: assistantId,
      createdBy: walletAddress.toLowerCase(),
      isActive: true,
    });

    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }

    // Get all files for this assistant
    const files = await File.find({
      assistantId: assistant._id,
      createdBy: walletAddress.toLowerCase(),
    }).sort({ createdAt: -1 });

    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({
      error: "Failed to fetch files",
    });
  }
});

// Upload file to user's knowledge base
router.post(
  "/knowledge-base/upload",
  upload.single("file"),
  async (req, res) => {
    let uploadedFile = null;

    try {
      const { walletAddress } = req.body;
      uploadedFile = req.file;

      console.log("Upload request received:", {
        walletAddress,
        file: uploadedFile
          ? {
              filename: uploadedFile.originalname,
              size: uploadedFile.size,
              path: uploadedFile.path,
            }
          : null,
      });

      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      // Find or create assistant for this user
      let assistant = await Assistant.findOne({
        createdBy: walletAddress.toLowerCase(),
        isActive: true,
      });

      console.log("Existing assistant:", assistant);

      if (!assistant) {
        console.log("No existing assistant found, creating new one...");
        assistant = await createAssistant(
          walletAddress,
          `assistant${walletAddress.slice(2, 8)}`,
        );
        console.log("New assistant created:", assistant);
      }

      console.log("Uploading file to Pinecone...");
      const pineconeResponse = await uploadFileToPinecone(
        assistant,
        uploadedFile,
      );
      console.log("Pinecone upload response:", pineconeResponse.data);

      // Create file record in database
      const file = new File({
        pineconeFileId: pineconeResponse.data.id,
        name: uploadedFile.originalname,
        assistantId: assistant._id,
        status: pineconeResponse.data.status,
        percentDone: pineconeResponse.data.percent_done,
        signedUrl: pineconeResponse.data.signed_url,
        errorMessage: pineconeResponse.data.error_message,
        metadata: pineconeResponse.data.metadata,
        createdBy: walletAddress.toLowerCase(),
      });

      await file.save();
      console.log("File record saved to database:", file);

      // Clean up uploaded file
      safeDeleteFile(uploadedFile.path);

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          ...pineconeResponse.data,
          _id: file._id,
        },
        assistant,
      });
    } catch (error) {
      console.error("Error in knowledge base upload:", {
        error: error.response?.data || error.message,
        status: error.response?.status,
      });

      if (uploadedFile) {
        safeDeleteFile(uploadedFile.path);
      }

      res.status(error.response?.status || 500).json({
        error:
          error.response?.data?.error?.message ||
          error.message ||
          "Internal server error",
      });
    }
  },
);

// Get file status
router.get("/files/:fileId/status", async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log("Checking status for file:", fileId);

    // Find file and populate assistant data
    const file = await File.findById(fileId).populate("assistantId");

    if (!file) {
      console.log("File not found:", fileId);
      return res.status(404).json({ error: "File not found" });
    }

    console.log("Found file:", {
      id: file._id,
      pineconeFileId: file.pineconeFileId,
      status: file.status,
      percentDone: file.percentDone,
    });

    try {
      // Get status from Pinecone
      console.log(
        "Checking Pinecone status at:",
        `${file.assistantId.host}/assistant/files/${file.assistantId.name}/${file.pineconeFileId}`,
      );
      const pineconeResponse = await axios.get(
        `${file.assistantId.host}/assistant/files/${file.assistantId.name}/${file.pineconeFileId}`,
        {
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
          },
        },
      );

      console.log("Pinecone status response:", pineconeResponse.data);

      // Update file status in database
      file.status = pineconeResponse.data.status;
      file.percentDone = (pineconeResponse.data.percent_done || 0) * 100;
      file.errorMessage = pineconeResponse.data.error_message;
      await file.save();

      console.log("Updated file status:", {
        status: file.status,
        percentDone: file.percentDone,
        errorMessage: file.errorMessage,
      });

      // If the file is completed, stop polling
      const response = {
        status: file.status,
        percent_done: file.percentDone,
        error_message: file.errorMessage,
      };

      res.json(response);
    } catch (pineconeError) {
      if (pineconeError.response?.status === 404) {
        // If we get a 404, the file is still being processed
        const currentTime = new Date();
        const timeSinceCreation =
          currentTime.getTime() - file.createdAt.getTime();
        const timeBasedProgress = Math.min(
          90,
          Math.floor((timeSinceCreation / 30000) * 100),
        ); // 30 seconds to reach 90%

        console.log("File not found in Pinecone, using time-based progress:", {
          timeSinceCreation,
          timeBasedProgress,
        });

        // Update progress based on time
        file.percentDone = timeBasedProgress;
        await file.save();

        // Return current status with estimated progress
        res.json({
          status: "Processing",
          percent_done: timeBasedProgress,
          error_message: null,
        });
      } else {
        console.error("Unexpected Pinecone error:", {
          status: pineconeError.response?.status,
          data: pineconeError.response?.data,
        });
        throw pineconeError;
      }
    }
  } catch (error) {
    console.error("Error getting file status:", error.response?.data || error);
    res.status(500).json({ error: "Failed to get file status" });
  }
});

// Deactivate an assistant
router.delete("/assistants/:assistantId", async (req, res) => {
  try {
    const { assistantId } = req.params;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    const assistant = await Assistant.findOne({
      _id: assistantId,
      createdBy: walletAddress.toLowerCase(),
    });

    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }

    // Delete from Pinecone first
    try {
      await axios.delete(
        `${assistant.host}/assistant/assistants/${assistant.pineconeAssistantId}`,
        {
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
          },
        },
      );
    } catch (pineconeError) {
      console.error(
        "Error deleting from Pinecone:",
        pineconeError.response?.data || pineconeError.message,
      );
      return res.status(pineconeError.response?.status || 500).json({
        error: "Failed to delete assistant from Pinecone",
      });
    }

    // If Pinecone deletion was successful, mark as inactive in our database
    assistant.isActive = false;
    await assistant.save();

    res.json({
      message:
        "Assistant deleted successfully from both Pinecone and local database",
    });
  } catch (error) {
    console.error("Error deactivating assistant:", error);
    res.status(500).json({
      error: "Failed to deactivate assistant",
    });
  }
});

module.exports = router;
