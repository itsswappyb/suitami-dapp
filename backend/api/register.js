const mongoose = require('mongoose');
const Registration = require('../models/Registration');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { walletAddress, telegramHandle } = req.body;

    // Validate input
    if (!walletAddress || !telegramHandle) {
      return res.status(400).json({ error: 'Wallet address and Telegram handle are required' });
    }

    if (!telegramHandle.startsWith('@')) {
      return res.status(400).json({ error: 'Telegram handle must start with @' });
    }

    // Check for existing registrations
    const existingWallet = await Registration.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet address already registered' });
    }

    const existingTelegram = await Registration.findOne({ telegramHandle });
    if (existingTelegram) {
      return res.status(400).json({ error: 'Telegram handle already registered' });
    }

    // Create new registration
    const registration = new Registration({
      walletAddress,
      telegramHandle
    });

    await registration.save();
    res.status(201).json({ message: 'Registration successful', data: registration });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
