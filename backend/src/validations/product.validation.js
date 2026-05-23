const { body, param, query } = require('express-validator');

const createProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required')
    .matches(/^[A-Z0-9\-_]+$/i).withMessage('SKU can only contain letters, numbers, hyphens and underscores'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('min_stock_threshold').optional().isInt({ min: 0 }).withMessage('Min threshold must be non-negative'),
  body('warehouse_id').optional({ nullable: true }).isInt().withMessage('Invalid warehouse ID'),
  body('supplier_id').optional({ nullable: true }).isInt().withMessage('Invalid supplier ID'),
];

const updateProduct = [
  param('id').isInt().withMessage('Invalid product ID'),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('min_stock_threshold').optional().isInt({ min: 0 }).withMessage('Min threshold must be non-negative'),
  body('warehouse_id').optional({ nullable: true }).isInt().withMessage('Invalid warehouse ID'),
  body('supplier_id').optional({ nullable: true }).isInt().withMessage('Invalid supplier ID'),
];

const listProducts = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
  query('category').optional().trim(),
  query('warehouse_id').optional().isInt().withMessage('Invalid warehouse ID'),
  query('search').optional().trim(),
];

module.exports = { createProduct, updateProduct, listProducts };
