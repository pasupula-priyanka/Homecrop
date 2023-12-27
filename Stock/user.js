const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Dummy admin credentials for demonstration purposes
const adminCredentials = {
    username: 'User',
    password: 'User123'
  };
  
  // Secret key for JWT (change this to a more secure key in production)
  const jwtSecretKey = 'yourSecretKey';
  
  // Route for admin login
  app.post('/userlogin', (req, res) => {
    const { username, password } = req.body;
    if (username === adminCredentials.username && password === adminCredentials.password) {   
      const token = jwt.sign({ username }, jwtSecretKey, { expiresIn: '1h' });
      res.status(200).json({
        message: 'User login successful',
        token: token
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  module.exports = app
  