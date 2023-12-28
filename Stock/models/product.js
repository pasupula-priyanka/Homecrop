// productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ['Plant Care', 'Grow Bags', 'Packing Materials', 'Potting Mix','Rolls'], required: true }
})

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
