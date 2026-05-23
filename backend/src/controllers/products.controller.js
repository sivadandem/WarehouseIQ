const { getDb } = require('../db/init');
const { logAction } = require('../middleware/logger');

const getAll = (req, res, next) => {
  try {
    const db = getDb();
    const { search = '', category = '', status = '', warehouse_id = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('p.category = ?');
      params.push(category);
    }
    if (warehouse_id) {
      conditions.push('p.warehouse_id = ?');
      params.push(warehouse_id);
    }
    if (status === 'low') {
      conditions.push('p.quantity <= p.min_stock_threshold');
    } else if (status === 'out') {
      conditions.push('p.quantity = 0');
    } else if (status === 'ok') {
      conditions.push('p.quantity > p.min_stock_threshold');
    }

    const where = conditions.join(' AND ');

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM products p WHERE ${where}
    `).get(...params).count;

    const products = db.prepare(`
      SELECT p.*, w.name as warehouse_name, s.name as supplier_name
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getOne = (req, res, next) => {
  try {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, w.name as warehouse_name, s.name as supplier_name
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const create = (req, res, next) => {
  try {
    const db = getDb();
    const { name, sku, category, quantity, price, warehouse_id, supplier_id, min_stock_threshold, description } = req.body;

    if (!name || !sku || !category) {
      return res.status(400).json({ success: false, message: 'Name, SKU and category are required.' });
    }

    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(409).json({ success: false, message: 'SKU already exists.' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, sku, category, quantity, price, warehouse_id, supplier_id, min_stock_threshold, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, sku.toUpperCase(), category, quantity || 0, price || 0, warehouse_id || null, supplier_id || null, min_stock_threshold || 10, description || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    logAction('CREATE', 'product', product.id, req.user.id, { sku: product.sku, name: product.name });

    res.status(201).json({ success: true, message: 'Product created.', data: product });
  } catch (err) {
    next(err);
  }
};

const update = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { name, sku, category, price, warehouse_id, supplier_id, min_stock_threshold, description } = req.body;

    // Check SKU uniqueness if changing
    if (sku && sku.toUpperCase() !== existing.sku) {
      const skuCheck = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.toUpperCase(), id);
      if (skuCheck) return res.status(409).json({ success: false, message: 'SKU already exists.' });
    }

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        warehouse_id = ?,
        supplier_id = ?,
        min_stock_threshold = COALESCE(?, min_stock_threshold),
        description = COALESCE(?, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name || null, sku ? sku.toUpperCase() : null, category || null, price || null,
      warehouse_id !== undefined ? warehouse_id : existing.warehouse_id,
      supplier_id !== undefined ? supplier_id : existing.supplier_id,
      min_stock_threshold || null, description || null, id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    logAction('UPDATE', 'product', parseInt(id), req.user.id, { changes: req.body });

    res.json({ success: true, message: 'Product updated.', data: updated });
  } catch (err) {
    next(err);
  }
};

const remove = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logAction('DELETE', 'product', parseInt(id), req.user.id, { sku: product.sku });

    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};

const getCategories = (req, res, next) => {
  try {
    const db = getDb();
    const cats = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
    res.json({ success: true, data: cats.map(c => c.category) });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, getCategories };
