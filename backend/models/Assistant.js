const mongoose = require("mongoose");

const assistantSchema = new mongoose.Schema({
  pineconeAssistantId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
  host: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String, // wallet address of the user who created this assistant
    required: true,
    ref: "Registration",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
assistantSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Assistant", assistantSchema);
