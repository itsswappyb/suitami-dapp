const mongoose = require('mongoose');
const Registration = require('../../models/Registration');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const count = await Registration.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
