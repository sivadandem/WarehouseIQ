const { getDb } = require('../db/init');

const toCsv = (rows, fields) => {
  if (!rows.length) return fields.join(',') + '\n';
  const header = fields.join(',');
  const lines = rows.map(r => fields.map(f => `"${String(r[f] ?? '').replace(/"/g, '""')}"`).join(','));
  return [header, ...lines].join('\n');
};

const inventoryReport = (req, res, next) => {
  try {
    const db = getDb();
    const products = db.prepare(`
      SELECT p.sku, p.name, p.category, p.quantity, p.price,
        (p.quantity * p.price) as total_value, p.min_stock_threshold,
        w.name as warehouse, s.name as supplier, p.updated_at
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.category, p.name
    `).all();

    const { format } = req.query;
    if (format === 'csv') {
      const fields = ['sku','name','category','quantity','price','total_value','min_stock_threshold','warehouse','supplier','updated_at'];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
      return res.send(toCsv(products, fields));
    }
    res.json({ success: true, data: products, generated_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

const lowStockReport = (req, res, next) => {
  try {
    const db = getDb();
    const products = db.prepare(`
      SELECT p.sku, p.name, p.category, p.quantity, p.min_stock_threshold,
        (p.min_stock_threshold - p.quantity) as deficit,
        w.name as warehouse, s.name as supplier
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.quantity <= p.min_stock_threshold
      ORDER BY p.quantity ASC
    `).all();

    const { format } = req.query;
    if (format === 'csv') {
      const fields = ['sku','name','category','quantity','min_stock_threshold','deficit','warehouse','supplier'];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=low_stock_report.csv');
      return res.send(toCsv(products, fields));
    }
    res.json({ success: true, data: products, generated_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

const movementReport = (req, res, next) => {
  try {
    const db = getDb();
    const { from, to } = req.query;
    let conditions = ['1=1'];
    let params = [];
    if (from) { conditions.push('DATE(sm.created_at) >= ?'); params.push(from); }
    if (to) { conditions.push('DATE(sm.created_at) <= ?'); params.push(to); }
    const where = conditions.join(' AND ');

    const movements = db.prepare(`
      SELECT sm.created_at as date, sm.type, sm.quantity, sm.notes, sm.reference_no,
        p.name as product_name, p.sku, u.name as performed_by, s.name as supplier
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      LEFT JOIN suppliers s ON sm.supplier_id = s.id
      WHERE ${where}
      ORDER BY sm.created_at DESC
    `).all(...params);

    const { format } = req.query;
    if (format === 'csv') {
      const fields = ['date','type','quantity','product_name','sku','supplier','performed_by','notes','reference_no'];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=movement_report.csv');
      return res.send(toCsv(movements, fields));
    }
    res.json({ success: true, data: movements, generated_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

const supplierReport = (req, res, next) => {
  try {
    const db = getDb();
    const suppliers = db.prepare(`
      SELECT s.name, s.contact_person, s.email, s.phone,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT po.id) as order_count,
        COALESCE(SUM(po.total_amount),0) as total_order_value
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      GROUP BY s.id ORDER BY total_order_value DESC
    `).all();

    const { format } = req.query;
    if (format === 'csv') {
      const fields = ['name','contact_person','email','phone','product_count','order_count','total_order_value'];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier_report.csv');
      return res.send(toCsv(suppliers, fields));
    }
    res.json({ success: true, data: suppliers, generated_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

module.exports = { inventoryReport, lowStockReport, movementReport, supplierReport };
