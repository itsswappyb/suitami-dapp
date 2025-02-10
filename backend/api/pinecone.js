const express = require("express");
const router = express.Router();
const axios = require("axios");

// Create a Pinecone assistant
router.post("/assistants", async (req, res) => {
  try {
    const { name, instructions, region } = req.body;

    if (!process.env.PINECONE_API_KEY) {
      return res
        .status(400)
        .json({ error: "PINECONE_API_KEY is not configured" });
    }

    const response = await axios.post(
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

    res.json(response.data);
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

module.exports = router;
