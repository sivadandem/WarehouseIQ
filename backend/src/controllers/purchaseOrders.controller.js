const { getDb } = require('../db/init');
const { logAction } = require('../middleware/logger');

const getAll = (req, res, next) => {
  try {
    const db = getDb();
    const { status, supplier_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let params = [];
    if (status) { conditions.push('po.status = ?'); params.push(status); }
    if (supplier_id) { conditions.push('po.supplier_id = ?'); params.push(supplier_id); }
    const where = conditions.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) as count FROM purchase_orders po WHERE ${where}`).get(...params).count;
    const orders = db.prepare(`
      SELECT po.*, s.name as supplier_name, u.name as created_by_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.created_by = u.id
      WHERE ${where}
      ORDER BY po.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    // Attach items
    const ordersWithItems = orders.map(o => ({
      ...o,
      items: db.prepare(`
        SELECT poi.*, p.name as product_name, p.sku
        FROM purchase_order_items poi
        JOIN products p ON poi.product_id = p.id
        WHERE poi.order_id = ?
      `).all(o.id)
    }));

    res.json({ success: true, data: ordersWithItems, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getOne = (req, res, next) => {
  try {
    const db = getDb();
    const order = db.prepare(`
      SELECT po.*, s.name as supplier_name, u.name as created_by_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.created_by = u.id
      WHERE po.id = ?
    `).get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    order.items = db.prepare(`
      SELECT poi.*, p.name as product_name, p.sku
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.order_id = ?
    `).all(order.id);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

const create = (req, res, next) => {
  try {
    const db = getDb();
    const { supplier_id, notes, items } = req.body;
    if (!supplier_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'supplier_id and items are required.' });
    }

    const orderNumber = `PO-${Date.now()}`;
    const totalAmount = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

    const runTx = db.transaction(() => {
      const po = db.prepare(`
        INSERT INTO purchase_orders (order_number, supplier_id, status, notes, total_amount, created_by)
        VALUES (?, ?, 'pending', ?, ?, ?)
      `).run(orderNumber, supplier_id, notes || null, totalAmount, req.user.id);

      items.forEach(item => {
        db.prepare(`
          INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
          VALUES (?, ?, ?, ?)
        `).run(po.lastInsertRowid, item.product_id, item.quantity, item.unit_price || 0);
      });
      return po.lastInsertRowid;
    });

    const poId = runTx();
    logAction('CREATE', 'purchase_order', poId, req.user.id, { order_number: orderNumber });
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
    res.status(201).json({ success: true, message: 'Purchase order created.', data: order });
  } catch (err) { next(err); }
};

const updateStatus = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (status === 'delivered' && order.status !== 'delivered') {
      const items = db.prepare('SELECT * FROM purchase_order_items WHERE order_id = ?').all(id);
      const processDelivery = db.transaction(() => {
        items.forEach(item => {
          db.prepare('UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
          db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, user_id, notes)
            VALUES (?, 'IN', ?, ?, ?)`).run(item.product_id, item.quantity, req.user.id, `PO Delivery: ${order.order_number}`);
        });
        db.prepare('UPDATE purchase_orders SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.user.id, id);
      });
      processDelivery();
    } else {
      db.prepare('UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    }

    logAction('UPDATE_STATUS', 'purchase_order', parseInt(id), req.user.id, { status });
    const updated = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    res.json({ success: true, message: `Order status updated to ${status}.`, data: updated });
  } catch (err) { next(err); }
};

const remove = (req, res, next) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.status === 'delivered') return res.status(400).json({ success: false, message: 'Cannot delete a delivered order.' });
    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Order deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, updateStatus, remove };
