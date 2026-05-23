const { getDb } = require('../db/init');

const getSummary = (req, res, next) => {
  try {
    const db = getDb();

    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalStock = db.prepare('SELECT COALESCE(SUM(quantity),0) as total FROM products').get().total;
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock_threshold AND quantity > 0').get().count;
    const outOfStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity = 0').get().count;
    const totalWarehouses = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
    const totalSuppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'pending'").get().count;
    const totalInventoryValue = db.prepare('SELECT COALESCE(SUM(quantity * price), 0) as value FROM products').get().value;

    const lowStockProducts = db.prepare(`
      SELECT p.*, w.name as warehouse_name FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.quantity <= p.min_stock_threshold
      ORDER BY p.quantity ASC LIMIT 10
    `).all();

    const recentMovements = db.prepare(`
      SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      ORDER BY sm.created_at DESC LIMIT 10
    `).all();

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(quantity) as total_qty, SUM(quantity*price) as total_value
      FROM products GROUP BY category ORDER BY total_value DESC
    `).all();

    const stockTrend = db.prepare(`
      SELECT DATE(created_at) as date,
        SUM(CASE WHEN type='IN' THEN quantity ELSE 0 END) as stock_in,
        SUM(CASE WHEN type='OUT' THEN quantity ELSE 0 END) as stock_out
      FROM stock_movements
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    const topProducts = db.prepare(`
      SELECT p.name, p.sku, p.quantity, p.price, p.category,
        COALESCE(SUM(sm.quantity),0) as total_moved
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.type = 'OUT'
      GROUP BY p.id ORDER BY total_moved DESC LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        stats: { totalProducts, totalStock, lowStockCount, outOfStockCount, totalWarehouses, totalSuppliers, pendingOrders, totalInventoryValue },
        lowStockProducts,
        recentMovements,
        categoryBreakdown,
        stockTrend,
        topProducts,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getSummary };
