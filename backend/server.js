require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Initialize DB
const { initializeDatabase } = require('./src/db/init');
initializeDatabase();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/stock', require('./src/routes/stock'));
app.use('/api/suppliers', require('./src/routes/suppliers'));
app.use('/api/purchase-orders', require('./src/routes/purchaseOrders'));
app.use('/api/warehouses', require('./src/routes/warehouses'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/logs', require('./src/routes/logs'));
app.use('/api/users', require('./src/routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(require('./src/middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 WarehouseIQ API running on http://localhost:${PORT}`);
});

module.exports = app;
