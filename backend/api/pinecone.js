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
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Helper function to create an assistant
async function createAssistant(walletAddress, name) {
  try {
    const response = await axios.post(
      "https://api.pinecone.io/assistant/assistants",
      {
        name,
        instructions: "You are a helpful assistant that answers questions based on the provided knowledge base.",
        region: "us",
      },
      {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    const assistant = new Assistant({
      pineconeAssistantId: response.data.id,
      name,
      instructions: "You are a helpful assistant that answers questions based on the provided knowledge base.",
      region: "us",
      createdBy: walletAddress.toLowerCase()
    });

    await assistant.save();
    return assistant;
  } catch (error) {
    console.error("Error creating assistant:", error.response?.data || error.message);
    throw error;
  }
}

// Helper function to upload file to assistant
async function uploadFileToPinecone(assistant, uploadedFile) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(uploadedFile.path), {
    filename: uploadedFile.originalname,
    contentType: uploadedFile.mimetype
  });

  return axios.post(
    `https://prod-1-data.ke.pinecone.io/assistant/files/${assistant.pineconeAssistantId}`,
    formData,
    {
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY,
        ...formData.getHeaders()
      },
    }
  );
}

// Get all assistants for a user
router.get("/assistants/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const assistants = await Assistant.find({ 
      createdBy: walletAddress.toLowerCase(),
      isActive: true 
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
      return res
        .status(400)
        .json({ error: "Wallet address is required" });
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
      pineconeAssistantId: pineconeResponse.data.id,
      name,
      instructions,
      region,
      createdBy: walletAddress.toLowerCase()
    });

    await assistant.save();

    res.status(201).json({
      message: "Assistant created successfully",
      assistant: {
        ...pineconeResponse.data,
        _id: assistant._id
      }
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
router.post("/assistants/:assistantId/files", upload.single('file'), async (req, res) => {
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
      isActive: true
    });

    if (!assistant) {
      // Clean up uploaded file
      fs.unlinkSync(uploadedFile.path);
      return res.status(404).json({ error: "Assistant not found" });
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(uploadedFile.path), {
      filename: uploadedFile.originalname,
      contentType: uploadedFile.mimetype
    });

    // Upload to Pinecone
    const pineconeResponse = await axios.post(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${assistant.pineconeAssistantId}`,
      formData,
      {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          ...formData.getHeaders()
        },
      }
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
      createdBy: walletAddress.toLowerCase()
    });

    await file.save();

    // Clean up uploaded file
    fs.unlinkSync(uploadedFile.path);

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        ...pineconeResponse.data,
        _id: file._id
      }
    });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    console.error("Error uploading file:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to upload file"
    });
  }
});

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
      isActive: true
    });

    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }

    // Get all files for this assistant
    const files = await File.find({ 
      assistantId: assistant._id,
      createdBy: walletAddress.toLowerCase()
    }).sort({ createdAt: -1 });

    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({
      error: "Failed to fetch files"
    });
  }
});

// Upload file to user's knowledge base
router.post("/knowledge-base/upload", upload.single('file'), async (req, res) => {
  try {
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

    // Find or create assistant for this user
    let assistant = await Assistant.findOne({ 
      createdBy: walletAddress.toLowerCase(),
      isActive: true
    });

    if (!assistant) {
      // Create a new assistant for this user
      try {
        assistant = await createAssistant(
          walletAddress,
          `${walletAddress.slice(0, 6)}'s Knowledge Base`
        );
      } catch (error) {
        // Clean up uploaded file
        fs.unlinkSync(uploadedFile.path);
        throw error;
      }
    }

    // Upload file to Pinecone
    const pineconeResponse = await uploadFileToPinecone(assistant, uploadedFile);

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
      createdBy: walletAddress.toLowerCase()
    });

    await file.save();

    // Clean up uploaded file
    fs.unlinkSync(uploadedFile.path);

    res.status(201).json({
      message: "File uploaded successfully to knowledge base",
      file: {
        ...pineconeResponse.data,
        _id: file._id
      },
      assistant: {
        _id: assistant._id,
        name: assistant.name,
        pineconeAssistantId: assistant.pineconeAssistantId
      }
    });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    console.error("Error uploading file to knowledge base:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to upload file to knowledge base"
    });
  }
});

// Get file status
router.get("/files/:fileId/status", async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Get status from Pinecone
    const pineconeResponse = await axios.get(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${file.pineconeFileId}`,
      {
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
        },
      }
    );

    // Update file status in our database
    file.status = pineconeResponse.data.status;
    file.percentDone = pineconeResponse.data.percent_done;
    file.errorMessage = pineconeResponse.data.error_message;
    await file.save();

    res.json({
      status: file.status,
      percent_done: file.percentDone,
      error_message: file.errorMessage
    });
  } catch (error) {
    console.error("Error getting file status:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to get file status"
    });
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
      createdBy: walletAddress.toLowerCase()
    });

    if (!assistant) {
      return res.status(404).json({ error: "Assistant not found" });
    }

    // Delete from Pinecone first
    try {
      await axios.delete(
        `https://api.pinecone.io/assistant/assistants/${assistant.pineconeAssistantId}`,
        {
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
          },
        }
      );
    } catch (pineconeError) {
      console.error("Error deleting from Pinecone:", pineconeError.response?.data || pineconeError.message);
      return res.status(pineconeError.response?.status || 500).json({
        error: "Failed to delete assistant from Pinecone"
      });
    }

    // If Pinecone deletion was successful, mark as inactive in our database
    assistant.isActive = false;
    await assistant.save();

    res.json({ message: "Assistant deleted successfully from both Pinecone and local database" });
  } catch (error) {
    console.error("Error deactivating assistant:", error);
    res.status(500).json({
      error: "Failed to deactivate assistant",
    });
  }
});

module.exports = router;
