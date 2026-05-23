const { getDb } = require('../db/init');
const { logAction } = require('../middleware/logger');

const stockIn = (req, res, next) => {
  try {
    const db = getDb();
    const { product_id, quantity, supplier_id, notes, reference_no } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'product_id and positive quantity are required.' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const newQty = product.quantity + parseInt(quantity);

    const runTransaction = db.transaction(() => {
      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, product_id);
      const movement = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, supplier_id, user_id, notes, reference_no)
        VALUES (?, 'IN', ?, ?, ?, ?, ?)
      `).run(product_id, parseInt(quantity), supplier_id || null, req.user.id, notes || null, reference_no || null);
      return movement.lastInsertRowid;
    });

    const movementId = runTransaction();
    logAction('STOCK_IN', 'stock_movement', movementId, req.user.id, { product_id, quantity, newQty });

    res.status(201).json({
      success: true,
      message: `Stock increased by ${quantity}. New quantity: ${newQty}.`,
      data: { product_id, quantity: newQty, movement_id: movementId },
    });
  } catch (err) {
    next(err);
  }
};

const stockOut = (req, res, next) => {
  try {
    const db = getDb();
    const { product_id, quantity, notes, reference_no } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'product_id and positive quantity are required.' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.quantity < parseInt(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}.`,
      });
    }

    const newQty = product.quantity - parseInt(quantity);

    const runTransaction = db.transaction(() => {
      db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, product_id);
      const movement = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, user_id, notes, reference_no)
        VALUES (?, 'OUT', ?, ?, ?, ?)
      `).run(product_id, parseInt(quantity), req.user.id, notes || null, reference_no || null);
      return movement.lastInsertRowid;
    });

    const movementId = runTransaction();
    logAction('STOCK_OUT', 'stock_movement', movementId, req.user.id, { product_id, quantity, newQty });

    res.status(201).json({
      success: true,
      message: `Stock decreased by ${quantity}. New quantity: ${newQty}.`,
      data: { product_id, quantity: newQty, movement_id: movementId },
    });
  } catch (err) {
    next(err);
  }
};

const getHistory = (req, res, next) => {
  try {
    const db = getDb();
    const { product_id, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let params = [];

    if (product_id) { conditions.push('sm.product_id = ?'); params.push(product_id); }
    if (type) { conditions.push('sm.type = ?'); params.push(type.toUpperCase()); }

    const where = conditions.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) as count FROM stock_movements sm WHERE ${where}`).get(...params).count;

    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, p.sku,
             u.name as user_name, s.name as supplier_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      LEFT JOIN suppliers s ON sm.supplier_id = s.id
      WHERE ${where}
      ORDER BY sm.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: movements,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { stockIn, stockOut, getHistory };
