const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Registration = require('../models/Registration');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Get all registrations with optional pagination
app.get('/registrations', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      Registration.find({}, { _id: 0, __v: 0 })
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments()
    ]);

    res.json({
      registrations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Fetch registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get total number of registrations
app.get('/registrations/count', async (req, res) => {
  try {
    const count = await Registration.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new wallet-telegram mapping
app.post('/register', async (req, res) => {
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
});

// Get registration by wallet address
app.get('/registration/:walletAddress', async (req, res) => {
  try {
    const registration = await Registration.findOne({ 
      walletAddress: req.params.walletAddress.toLowerCase() 
    });
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json(registration);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;
