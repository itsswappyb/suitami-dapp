const express = require("express");
const router = express.Router();
const axios = require("axios");
const Assistant = require("../models/Assistant");

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
