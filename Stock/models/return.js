const mongoose = require('mongoose');

// Update the package schema in server.js
const packageSchema = new mongoose.Schema({
  trackingNumber: String,
  date: Date,
  platform: String,
  category: String,
  product: String,
  condition: {
    type: String,
    enum: ['Good', 'Bad']
  },
  quantity: {
    type: Number,
    default: 1, // You can set a default value if needed
    min: 1,     // Set minimum value (optional)
  },
});

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;
