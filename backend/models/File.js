const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  pineconeFileId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  assistantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assistant",
    required: true,
  },
  status: {
    type: String,
    enum: ["Processing", "Available", "Completed", "Failed"],
    default: "Processing",
  },
  percentDone: {
    type: Number,
    default: 0,
  },
  signedUrl: String,
  errorMessage: String,
  metadata: {
    type: Map,
    of: String,
    default: {},
  },
  createdBy: {
    type: String,
    required: true,
    ref: "Registration",
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
fileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("File", fileSchema);
