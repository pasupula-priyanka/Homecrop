const express = require('express');
const jwt = require('jsonwebtoken');
const DailyStockRecord = require('./models/stock')
const Package = require('./models/return')
//const mongoose = require("mongoose")


const app = express();
app.use(express.json());

app.get('/category-inflow-outflow', async (req, res) => {
  try {
    const { year, month, category } = req.query;

    // Validate inputs
    if (!year || !month || !category) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Validate month and year format
    const validMonth = parseInt(month);
    const validYear = parseInt(year);
    if (isNaN(validMonth) || isNaN(validYear) || validMonth < 1 || validMonth > 12 || validYear < 1900) {
      return res.status(400).json({ message: 'Invalid month or year' });
    }

    // Calculate the first and last day of the specified month
    const firstDay = new Date(validYear, validMonth - 1, 1);
    const lastDay = new Date(validYear, validMonth, 0);

    // Find records for the specified month, year, and category
    const records = await DailyStockRecord.find({
      'products.records.date': { $gte: firstDay, $lte: lastDay },
    }).populate('products.product');  // Populate the 'product' field

    // Calculate inflow and outflow for each product within the category
    const productDataList = [];

    records.forEach((record) => {
      record.products.forEach((productData) => {
        const product = productData.product;

        if (product.category === category) {
          let inflowTotal = 0;
          let outflowTotal = 0;

          productData.records.forEach((r) => {
            inflowTotal += r.inflow || 0;
            outflowTotal += r.outflow || 0;
          });

          productDataList.push({
            productName: product.name,
            inflow: inflowTotal,
            outflow: outflowTotal,
          });
        }
      });
    });

    res.status(200).json({
      year,
      month,
      category,
      productDataList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

app.post('/packages', async (req, res) => {
  const { trackingNumber, date, platform, product, category, condition, quantity } = req.body;

  // Validate and convert the date format to 'yyyy-mm-dd'
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (!isValidDate) {
    return res.status(400).json({ error: 'Invalid date format. Use yyyy-mm-dd.' });
  }

  try {
    // Create a new Date object from the validated date string
    const formattedDate = new Date(date);

    const newPackage = new Package({
      trackingNumber,
      date: formattedDate,
      platform,
      product,
      category,
      condition,
      quantity, // Include the quantity field
    });

    // Save the new package to the database
    const savedPackage = await newPackage.save();

    res.status(201).json(savedPackage);
  } catch (error) {
    console.error('Error adding package:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/packages/:id', async (req, res) => {
  const { trackingNumber, date, platform, product, category, condition, quantity } = req.body;

  try {
    // Find the package by ID
    const packageToUpdate = await Package.findById(req.params.id);

    if (!packageToUpdate) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Update package fields if provided in the request body
    if (trackingNumber) {
      packageToUpdate.trackingNumber = trackingNumber;
    }

    if (date) {
      packageToUpdate.date = date;
    }

    if (platform) {
      packageToUpdate.platform = platform;
    }

    if (product) {
      packageToUpdate.product = product;
    }

    if (category) {
      packageToUpdate.category = category;
    }

    if (condition) {
      packageToUpdate.condition = condition;
    }

    if (quantity) {
      packageToUpdate.quantity = quantity;
    }

    // Save the updated package to the database
    const updatedPackage = await packageToUpdate.save();

    res.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/packages/:id', async (req, res) => {
  try {
    // Find the package by ID and remove it
    const deletedPackage = await Package.findOneAndDelete({ _id: req.params.id });

    if (!deletedPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ message: 'Package deleted successfully', deletedPackage });
  } catch (error) {
    console.error('Error deleting package:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/packages/:date', async (req, res) => {
  const { date } = req.params;

  try {
    // Find packages with a date match
    const packages = await Package.find({ date: new Date(date) });

    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages by date:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/platforms/:year/:month/:category', async (req, res) => {
  const { year, month, category } = req.params;

  try {
    // Convert year and month to Date objects
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    // Aggregate to group data by platform, then by product and calculate total quantity, good quantity, and bad quantity for each combination
    const platformData = await Package.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
          category: category,
        },
      },
      {
        $group: {
          _id: {
            platform: '$platform',
            product: '$product',
          },
          totalQuantity: { $sum: '$quantity' },
          good: {
            $sum: {
              $cond: [{ $eq: ['$condition', 'Good'] }, '$quantity', 0],
            },
          },
          bad: {
            $sum: {
              $cond: [{ $eq: ['$condition', 'Bad'] }, '$quantity', 0],
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.platform',
          products: {
            $push: {
              product: '$_id.product',
              total: '$totalQuantity',
              good: '$good',
              bad: '$bad',
            },
          },
          totalPlatformQuantity: { $sum: '$totalQuantity' },
        },
      },
    ]);

    // Prepare the response
    const result = platformData.map((item) => ({
      platform: item._id,
      products: item.products,
      totalPlatformQuantity: item.totalPlatformQuantity,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching platform data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  module.exports = app
  
