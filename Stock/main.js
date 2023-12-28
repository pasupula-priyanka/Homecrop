const express = require('express');
const jwt = require('jsonwebtoken'); // Don't forget to install this package: npm install jsonwebtoken
const authenticateToken = require('./middleware/middleware');
const app = express();
app.use(express.json());
const Product = require('./models/product')
const DailyStockRecord = require('./models/stock')
const mongoose = require("mongoose")


// Secret key for JWT (change this to a more secure key in production)
const jwtSecretKey = 'yourSecretKey';


// Dummy admin and user credentials for demonstration purposes
const credentials = {
  admin: {
    username: 'admin',
    password: 'admin123',
  },
  user: {
    username: 'User',
    password: 'User123',
  },
};



app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Determine the role based on the credentials
  const role = credentials.admin.username === username && credentials.admin.password === password
    ? 'admin'
    : credentials.user.username === username && credentials.user.password === password
    ? 'user'
    : null;

  if (role) {
    const token = jwt.sign({ username, role }, jwtSecretKey, { expiresIn: '1h' });

    res.status(200).json({
      message: `${role} login successful`,
      token: token,
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});
// Route to add a product
app.post('/add-product', async (req, res) => {
    try {
      const { name, category} = req.body;
      if (!['Plant Care', 'Grow Bags', 'Packing Materials', 'Potting Mix', 'Rolls'].includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const newProduct = new Product({ name, category}); 
      await newProduct.save();  
      res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        console.error(error);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
        return res.status(400).json({ message: 'Product name must be unique' });
        }
        res.status(500).json({ message: 'Internal Server Error' });
      }
  });


  // Route to update a product
app.patch('/update-product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    // Check if the provided ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Try to find the existing product by ID
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update the product fields if provided
    if (name) {
      existingProduct.name = name;
    }

    if (category) {
      // Validate the category against predefined categories
      if (!['Plant Care', 'Grow Bags', 'Packing Materials', 'Potting Mix'].includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }

      existingProduct.category = category;
    }

    // Save the updated product
    await existingProduct.save();

    res.status(200).json({ message: 'Product updated successfully', product: existingProduct });
  } catch (error) {
    console.error(error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal Server Error' });
  }
});

  // Route to get products by category
  app.get('/get-products/:category', async (req, res) => {
    try {
      const { category } = req.params;
  
      // Check if the provided category is valid
      if (!['Plant Care', 'Grow Bags', 'Packing Materials', 'Potting Mix'].includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
  
      // Find products by category
      const products = await Product.find({ category });
  
      if (products.length === 0) {
        return res.status(404).json({ message: 'No products found for the specified category' });
      }
  
      res.status(200).json({ message: 'Products retrieved successfully', products });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
// In your server.js or routes file
app.get('/categories', (req, res) => {
  const categories = ['Plant Care', 'Grow Bags', 'Packing Materials', 'Potting Mix', 'Rolls'];
  res.status(200).json({ categories });
});


// Route to note the opening and closing stock for a specific day
app.post('/record-stock', async (req, res) => {
  try {
    const { openingStock, closingStock, inflow, outflow, usage, product, date } = req.body;

    const filter = {
      'products.product': product,
      'products.records.date': date,
    };

    const existingRecord = await DailyStockRecord.findOne(filter);

    if (existingRecord) {
      // If the date exists, update opening and closing stocks
      const update = {
        $set: {
          'products.$[p].records.$[r].openingStock': openingStock,
          'products.$[p].records.$[r].closingStock': closingStock,
          'products.$[p].records.$[r].inflow': inflow,
          'products.$[p].records.$[r].outflow': outflow,
          'products.$[p].records.$[r].usage': usage,
        },
      };

      const options = {
        arrayFilters: [
          { 'p.product': product },
          { 'r.date': date },
        ],
        new: true,
      };

      const record = await DailyStockRecord.findOneAndUpdate(filter, update, options);

      if (record) {
        return res.status(200).json({
          message: 'Stock record for the specified day updated successfully',
          record: record,
        });
      }
    }

    // If the date does not exist, create a new record
    const newRecord = {
      date,
      openingStock,
      closingStock,
      inflow,
      outflow,
      usage,
    };

    const recordToUpdate = await DailyStockRecord.findOneAndUpdate(
      { 'products.product': product },
      { $push: { 'products.$.records': newRecord } },
      { new: true }
    );

    if (recordToUpdate) {
      return res.status(201).json({
        message: 'Stock record recorded successfully',
        record: recordToUpdate,
      });
    }

    // If no existing record and no record to update, create a new one
    const newStockRecord = new DailyStockRecord({
      products: [
        {
          product,
          records: [newRecord],
        },
      ],
    });

    await newStockRecord.save();

    res.status(201).json({ message: 'Stock record recorded successfully', record: newStockRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get('/wholestock-data', async (req, res) => {
  try {
    const { category, date } = req.query;
    console.log('Received request with parameters:', category, date);

    if (!category || !date) {
      return res
        .status(400)
        .json({ message: 'Both date and category are required in the query parameters' });
    }

    const productIds = await Product.find({ category }).distinct('_id');

    const stockData = await DailyStockRecord.aggregate([
      {
        $unwind: '$products',
      },
      {
        $match: {
          'products.product': { $in: productIds },
        },
      },
      {
        $project: {
          product: '$products.product',
          records: {
            $filter: {
              input: '$products.records',
              as: 'record',
              cond: { $lte: ['$$record.date', new Date(date)] },
            },
          },
        },
      },
      {
        $unwind: '$records',
      },
      {
        $sort: { 'records.date': -1 },
      },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$product.name' },
          openingBalance: {
            $first: {
              $cond: [
                { $eq: ['$records.date', new Date(date)] },
                '$records.openingStock',
                '$records.closingStock',
              ],
            },
          },
          closingStock: {
            $first: {
              $cond: [
                { $eq: ['$records.date', new Date(date)] },
                '$records.closingStock',
                0,
              ],
            },
          },
          inflow: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$records.date', new Date(date)] },
                    { $ne: ['$records.inflow', null] },
                  ],
                },
                '$records.inflow',
                0,
              ],
            },
          },
          outflow: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$records.date', new Date(date)] },
                    { $ne: ['$records.outflow', null] },
                  ],
                },
                '$records.outflow',
                0,
              ],
            },
          },
          usage: {
            $first: {
              $cond: [
                { $eq: ['$records.date', new Date(date)] },
                '$records.usage',
                null,
              ],
            },
          },
        },
      },
    ]);

    const result = stockData.reduce((acc, { _id, openingBalance, closingStock, inflow, outflow, usage }) => {
      acc[_id] = {
        openingBalance: openingBalance || 0,
        closingStock: closingStock || 0,
        inflow: inflow || 0,
        outflow: outflow || 0,
        usage: usage || '',
      };
      return acc;
    }, {});

    return res.status(200).json({
      message: 'Stock data retrieved successfully',
      stockData: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




// Add a route to get stock data by date and category
app.get('/stock-data', async (req, res) => {
  try {
    const { date, category } = req.query;

    if (!date || !category) {
      return res.status(400).json({ message: 'Both date and category are required in the query parameters' });
    }

    // Step 1: Find product IDs for the given category
    const productIds = await Product.find({ category }).distinct('_id');

    // Step 2: Find stock data for the product IDs on the given date
    const stockData = await DailyStockRecord.aggregate([
      {
        $unwind: '$products',
      },
      {
        $match: {
          'products.product': { $in: productIds },
          'products.records.date': new Date(date),
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $group: {
          _id: '$_id',
          products: {
            $push: {
              product: {
                _id: '$product._id',
                name: '$product.name',
                category: '$product.category',
              },
              records: {
                $filter: {
                  input: '$products.records',
                  as: 'record',
                  cond: { $eq: ['$$record.date', new Date(date)] },
                },
              },
            },
          },
        },
      },
    ]);

    if (stockData && stockData.length > 0) {
      return res.status(200).json({ message: 'Stock data retrieved successfully', stockData });
    } else {
      return res.status(404).json({ message: 'No stock data found for the specified date and category' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Route to get the current stock for a specific product category
app.get('/current-stock/:category', async (req, res) => {
  try {
    const { category } = req.params;

    // Find all products in the specified category
    const productsInCategory = await Product.find({ category });

    console.log("Products in category:", productsInCategory);

    if (productsInCategory.length === 0) {
      return res.status(404).json({ message: 'No products found for the specified category' });
    }

    const productIds = productsInCategory.map(product => product._id);

    // Find the record for the specified product category
    const records = await DailyStockRecord.aggregate([
      { $match: { 'products.product': { $in: productIds } } },
      { $unwind: '$products' },
      { $match: { 'products.product': { $in: productIds } } },
      { $unwind: '$products.records' },
      { $sort: { 'products.records.date': -1 } },
      {
        $group: {
          _id: '$_id',
          products: { $push: '$products' },
        },
      },
    ]);

    console.log("Records:", records);

    if (!records || records.length === 0) {
      return res.status(404).json({ message: 'No stock record found for the specified category' });
    }

    // Extract latest records for each matching product
    const stocks = productsInCategory.map(product => {
      const matchingRecord = records.find(record =>
        record.products.some(p => p.product.equals(product._id))
      );

      if (matchingRecord) {
        const latestRecord = matchingRecord.products
          .find(p => p.product.equals(product._id))
          .records;

        return {
          productName: product.name,
          currentStock: latestRecord.closingStock,
          date: latestRecord.date,
        };
      } else {
        return {
          productName: product.name,
          currentStock: 0,
          date: null,
        };
      }
    });

    res.status(200).json({
      message: 'Current stocks retrieved successfully',
      stocks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/monthly-stocks/:year/:month/:category', async (req, res) => {
  try {
    const { year, month, category } = req.params;
    console.log('Received request with parameters:', { year, month, category });
    // Validate month parameter
    const monthNumber = parseInt(month, 10);
    if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({ error: 'Invalid month parameter' });
    }

    // Find product IDs for the specified category
    const productsInCategory = await Product.find({ category });

    // Extract product IDs
    const productIds = productsInCategory.map((product) => product._id);

    // Define the start and end date of the month
    const monthStartDate = new Date(`${year}-${monthNumber.toString().padStart(2, '0')}-01`);
    const monthEndDate = new Date(monthStartDate);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);
    monthEndDate.setDate(monthEndDate.getDate() - 1); // Set to the last day of the month

    console.log('Month Start Date:', monthStartDate);
    console.log('Month End Date:', monthEndDate);

    // Fetch opening and closing stocks for each product
    const monthlyStocks = await Promise.all(
      productIds.map(async (productId) => {
        console.log('Fetching data for Product ID:', productId);

        // Fetch the latest record before or on the start date
        const openingStockRecord = await DailyStockRecord.findOne({
          'products.product': productId,
          'products.records.date': { $lte: monthStartDate },
        }).sort({ 'products.records.date': -1 });

        console.log('Opening Stock Record:', openingStockRecord);

        // Fetch the latest record before or on the end date
        const closingStockRecord = await DailyStockRecord.findOne({
          'products.product': productId,
          'products.records.date': { $lte: monthEndDate },
        }).sort({ 'products.records.date': -1 });

        console.log('Closing Stock Record:', closingStockRecord);

        // Find the record for the start date
        const openingStock =
          openingStockRecord &&
          openingStockRecord.products[0].records.find(
            (rec) => rec.date.getTime() === monthStartDate.getTime()
          );

        // Find the record for the end date
        const closingStock =
          closingStockRecord &&
          closingStockRecord.products[0].records.find(
            (rec) => rec.date.getTime() === monthEndDate.getTime()
          );

        console.log('Opening Stock:', openingStock);
        console.log('Closing Stock:', closingStock);

        // Find product name based on product ID
        const product = productsInCategory.find((p) => p._id.toString() === productId.toString());

        return {
          name: product ? product.name : 'Unknown',
          openingStock: openingStock ? openingStock.openingStock : 0,
          closingStock: closingStock ? closingStock.closingStock : 0,
        };
      })
    );

    console.log('Monthly Stocks:', monthlyStocks);
    res.json(monthlyStocks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
  });



module.exports = app;
