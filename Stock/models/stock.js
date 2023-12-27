// dailyStockRecordModel.js
const mongoose = require('mongoose');

const stockRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  openingStock: { type: Number, default: 0 },
  closingStock: { type: Number, default: 0 },
  inflow: { type: Number, default: 0 },
  outflow: { type: Number, default: 0 },
  usage: { type: String, default: '' },
});

const dailyStockRecordSchema = new mongoose.Schema({
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      records: [stockRecordSchema],
    },
  ],
});

const DailyStockRecord = mongoose.model('DailyStockRecord', dailyStockRecordSchema);

module.exports = DailyStockRecord;
