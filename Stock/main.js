import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from './Layout_A';

const StockManagement = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentStock, setCurrentStock] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productStocks, setProductStocks] = useState([]);
  const [recordDate, setRecordDate] = useState('');
  const [openingBalanceLoading, setOpeningBalanceLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory && recordDate) {
      fetchOpeningBalances();
    }
  }, [selectedCategory, recordDate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('https://homecrop.vercel.app/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchOpeningBalances = async () => {
    try {
      const response = await axios.get(`https://homecrop.vercel.app/wholestock-data`, {
        params: {
          category: selectedCategory,
          date: recordDate || new Date().toISOString(),
        },
      });
  
      console.log('Request sent to wholestock-data:', response.config);
  
      const stockData = response.data.stockData || {};
  
      setProductStocks((prevProductStocks) =>
        prevProductStocks.map((prevProductStock) => {
          const stockInfo = stockData[prevProductStock.id] || {};
          return {
            ...prevProductStock,
            openingBalance: stockInfo.openingBalance || 0,
            closingBalance: stockInfo.closingStock || 0,
            inflow: stockInfo.inflow || 0,
            outflow: stockInfo.outflow || 0,
            usage: stockInfo.usage || '',
          };
        })
      );
  
      setOpeningBalanceLoading(false);
    } catch (error) {
      console.error('Error fetching opening balances:', error);
      console.log('Full error object:', error);
      setOpeningBalanceLoading(false);
    }
  };
  

  const fetchCurrentStock = async (category) => {
    try {
      const response = await axios.get(`https://homecrop.vercel.app/get-products/${category}`);
      setCurrentStock(response.data.products || []);
      setProductStocks(
        response.data.products.map((product) => ({
          id: product._id,
          openingBalance: 0,
          closingBalance: 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching current stock:', error);
    }
  };

  const handleCategoryChange = async (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);

    if (newCategory) {
      await fetchCurrentStock(newCategory);
      await fetchOpeningBalances();
    } else {
      setCurrentStock([]);
      setProductStocks([]);
    }
  };

  const handleRecordStock = async (productId, openingBalance, inflow, outflow, usage) => {
    try {
      // Calculate closing balance
      const productStringId = productId.toString();

      const closingBalance = openingBalance + inflow - outflow;

      console.log('Updating stock:', productStringId, openingBalance, inflow, outflow, usage, closingBalance, recordDate);

      if (!recordDate) {
        alert('Please select a date');
        return;
      }

      // Pass the closingBalance to the API call
      await axios.post('https://homecrop.vercel.app/record-stock', {
        openingStock: openingBalance,
        closingStock: closingBalance,
        inflow,
        outflow,
        usage,
        product: productId,
        date: recordDate,
      });

      console.log('Stock updated successfully');

      await fetchOpeningBalances();
      alert('Stock updated successfully');
    } catch (error) {
      console.error('Error recording stock:', error);
      alert('Error in updating the stock');
    }
  };
  

  return (
    <Layout>
  <div>
    <h1>Stock Management</h1>
    <div>
      <label>Select Category:</label>
      <select value={selectedCategory} onChange={(e) => handleCategoryChange(e)}>
        <option value="">Select...</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
    {selectedCategory && (
      <div>
        <label>Select Date:</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="styled-date-input"
        />

        <h2>Current Stock for {selectedCategory}</h2>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Product</th>
              <th>Opening Stock</th>
              <th>Inflow</th>
              <th>Outflow</th>
              <th>Usage</th>
              <th>Closing Stock</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentStock.map((product, index) => (
              <tr key={product._id}>
                <td>{index + 1}</td>
                <td>{product.name}</td>
                <td>
                  <input
                    type="number"
                    value={
                      productStocks.find(
                        (productStock) => productStock.id === product._id
                      )?.openingBalance || 0
                    }
                    onChange={(e) =>
                      setProductStocks((prevProductStocks) =>
                        prevProductStocks.map((prevProductStock) =>
                          prevProductStock.id === product._id
                            ? { ...prevProductStock, openingBalance: Number(e.target.value) }
                            : prevProductStock
                        )
                      )
                    }
                    placeholder="Enter Opening Balance"
                    disabled={openingBalanceLoading}
                  />
                </td>
               
                <td>
                  <input
                    type="number"
                    value={
                      productStocks.find(
                        (productStock) => productStock.id === product._id
                      )?.inflow || 0
                    }
                    onChange={(e) =>
                      setProductStocks((prevProductStocks) =>
                        prevProductStocks.map((prevProductStock) =>
                          prevProductStock.id === product._id
                            ? { ...prevProductStock, inflow: Number(e.target.value) }
                            : prevProductStock
                        )
                      )
                    }
                    placeholder="Enter Inflow"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={
                      productStocks.find(
                        (productStock) => productStock.id === product._id
                      )?.outflow || 0
                    }
                    onChange={(e) =>
                      setProductStocks((prevProductStocks) =>
                        prevProductStocks.map((prevProductStock) =>
                          prevProductStock.id === product._id
                            ? { ...prevProductStock, outflow: Number(e.target.value) }
                            : prevProductStock
                        )
                      )
                    }
                    placeholder="Enter Outflow"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={
                      productStocks.find(
                        (productStock) => productStock.id === product._id
                      )?.usage || ""
                    }
                    onChange={(e) =>
                      setProductStocks((prevProductStocks) =>
                        prevProductStocks.map((prevProductStock) =>
                          prevProductStock.id === product._id
                            ? { ...prevProductStock, usage: e.target.value }
                            : prevProductStock
                        )
                      )
                    }
                    placeholder="Enter Usage"
                  />
                </td>
                <td>
          <input
            type="number"
            value={
              productStocks.find(
                (productStock) => productStock.id === product._id
              )?.closingBalance || 0
            }
            placeholder="Closing Balance"
            readOnly
          />
        </td>
        <td>
          <button
            onClick={() =>
              handleRecordStock(
                product._id,
                productStocks.find(
                  (productStock) => productStock.id === product._id
                )?.openingBalance || 0,
                productStocks.find(
                  (productStock) => productStock.id === product._id
                )?.inflow || 0,
                productStocks.find(
                  (productStock) => productStock.id === product._id
                )?.outflow || 0,
                productStocks.find(
                  (productStock) => productStock.id === product._id
                )?.usage || ""
              )
            }
          >
            Update 
          </button>
        </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</Layout>

  );
};

export default StockManagement;
