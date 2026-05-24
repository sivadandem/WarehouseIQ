require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Initialize DB
const { initializeDatabase, getDb } = require('./src/db/init');
initializeDatabase();

// Auto-seed if no users exist
const bcrypt = require('bcryptjs');
const db = getDb();
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (true) {
  console.log('🌱 No data found, seeding database...');

  // Clear existing data
  db.exec(`
    DELETE FROM inventory_logs;
    DELETE FROM purchase_order_items;
    DELETE FROM purchase_orders;
    DELETE FROM stock_movements;
    DELETE FROM products;
    DELETE FROM suppliers;
    DELETE FROM warehouses;
    DELETE FROM users;
  `);

  // Users
  const insertUser = db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`);
  const adminId = insertUser.run('Siva Dandem', 'sivadandem7@warehouseiq.com', bcrypt.hashSync('Admin@123', 10), 'admin').lastInsertRowid;
  const managerId = insertUser.run('Kutty', 'kutty@warehouseiq.com', bcrypt.hashSync('Manager@123', 10), 'manager').lastInsertRowid;
  const staffId = insertUser.run('Nitin', 'nitin@warehouseiq.com', bcrypt.hashSync('Staff@123', 10), 'staff').lastInsertRowid;

  // Warehouses
  const insertWarehouse = db.prepare(`INSERT INTO warehouses (name, location, capacity, available_space, description) VALUES (?, ?, ?, ?, ?)`);
  const w1 = insertWarehouse.run('Mumbai Central Warehouse', 'Andheri East, Mumbai, Maharashtra', 10000, 6500, 'Primary distribution center for West India').lastInsertRowid;
  const w2 = insertWarehouse.run('Delhi NCR Hub', 'Sector 63, Noida, Uttar Pradesh', 8000, 3200, 'North India distribution hub').lastInsertRowid;
  const w3 = insertWarehouse.run('Bengaluru South Depot', 'Electronic City, Bengaluru, Karnataka', 5000, 4100, 'South India regional depot').lastInsertRowid;

  // Suppliers
  const insertSupplier = db.prepare(`INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)`);
  const s1 = insertSupplier.run('Tata Electronics Pvt. Ltd.', 'Suresh Menon', '+91-98201-11001', 'suresh@tataelectronics.in', '12 MIDC Industrial Area, Pune, Maharashtra').lastInsertRowid;
  const s2 = insertSupplier.run('Godrej Interio', 'Meena Iyer', '+91-98201-11002', 'meena@godrejinterio.com', '456 LBS Marg, Vikhroli, Mumbai, Maharashtra').lastInsertRowid;
  const s3 = insertSupplier.run('Dixon Technologies', 'Vikram Singh', '+91-98201-11003', 'vikram@dixon.in', 'Plot 4, Noida Special Economic Zone, Noida, UP').lastInsertRowid;
  const s4 = insertSupplier.run('Mahindra Logistics', 'Deepa Nair', '+91-98201-11004', 'deepa@mahindralogistics.com', '5th Floor, Mahindra Towers, Worli, Mumbai').lastInsertRowid;
  const s5 = insertSupplier.run('Bosch India Ltd.', 'Kiran Reddy', '+91-98201-11005', 'kiran@bosch.in', 'Hosur Road, Adugodi, Bengaluru, Karnataka').lastInsertRowid;

  // Products
  const insertProduct = db.prepare(`INSERT INTO products (name, sku, category, quantity, price, warehouse_id, supplier_id, min_stock_threshold, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const products = [
    ['Laptop Inspiron 15', 'SKU-LAP-001', 'Electronics', 45, 72999.00, w1, s3, 10, 'Dell Inspiron 15 laptop'],
    ['Wireless Mouse', 'SKU-MOU-002', 'Electronics', 120, 1299.00, w1, s3, 20, 'Logitech ergonomic wireless mouse'],
    ['USB-C Hub 7-port', 'SKU-HUB-003', 'Electronics', 8, 2499.00, w2, s3, 15, '7-port USB-C hub'],
    ['Mechanical Keyboard', 'SKU-KEY-004', 'Electronics', 60, 4999.00, w1, s1, 10, 'RGB mechanical keyboard'],
    ['Monitor 27" 4K', 'SKU-MON-005', 'Electronics', 25, 32999.00, w1, s3, 5, '4K UHD display monitor'],
    ['Godrej Office Chair', 'SKU-CHR-006', 'Furniture', 18, 18500.00, w3, s2, 5, 'Ergonomic office chair by Godrej'],
    ['Godrej Standing Desk', 'SKU-DSK-007', 'Furniture', 12, 35000.00, w3, s2, 3, 'Height-adjustable standing desk'],
    ['Webcam 1080p', 'SKU-CAM-008', 'Electronics', 55, 3499.00, w2, s3, 15, 'HD webcam with mic'],
    ['Power Strip 6-outlet', 'SKU-PWR-009', 'Electronics', 200, 899.00, w1, s1, 30, 'Surge protected power strip'],
    ['Noise-Cancel Headset', 'SKU-HST-010', 'Electronics', 40, 12999.00, w2, s3, 10, 'Active noise cancelling headset'],
    ['Thermal Label Printer', 'SKU-LBL-011', 'Office', 22, 8500.00, w1, s5, 5, 'Thermal label printer by Bosch'],
    ['Barcode Scanner', 'SKU-BAR-012', 'Office', 35, 4200.00, w1, s5, 10, 'Wireless barcode scanner'],
    ['Safety Gloves Large', 'SKU-GLV-013', 'Safety', 150, 450.00, w3, s4, 50, 'Heavy-duty safety gloves'],
    ['Safety Helmet Yellow', 'SKU-HAT-014', 'Safety', 80, 750.00, w3, s4, 20, 'ISI certified safety helmet'],
    ['Forklift Battery 48V', 'SKU-BAT-015', 'Equipment', 6, 55000.00, w2, s5, 3, 'Industrial forklift battery'],
    ['Hydraulic Pallet Jack', 'SKU-PAL-016', 'Equipment', 4, 18500.00, w2, s5, 2, 'Manual hydraulic pallet jack'],
    ['Steel Shelving Unit', 'SKU-SHV-017', 'Furniture', 30, 9500.00, w3, s2, 5, 'Heavy-duty steel shelving unit'],
    ['Packaging Tape 36-pk', 'SKU-TAP-018', 'Supplies', 500, 120.00, w1, s4, 100, 'Heavy-duty packaging tape'],
    ['Bubble Wrap 100ft', 'SKU-BUB-019', 'Supplies', 75, 850.00, w1, s4, 20, 'Protective bubble wrap roll'],
    ['Fire Extinguisher 4kg', 'SKU-FIR-020', 'Safety', 3, 2200.00, w3, s4, 5, 'ABC dry powder extinguisher - BIS certified'],
  ];
  const productIds = products.map(p => insertProduct.run(...p).lastInsertRowid);

  // Purchase Orders
  const insertPO = db.prepare(`INSERT INTO purchase_orders (order_number, supplier_id, status, notes, total_amount, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertPOItem = db.prepare(`INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`);

  const po1 = insertPO.run('PO-2024-001', s3, 'delivered', 'Q1 Electronics restock - Dixon Technologies', 850000.00, adminId, '2024-01-10 09:00:00').lastInsertRowid;
  insertPOItem.run(po1, productIds[0], 10, 72000.00);
  insertPOItem.run(po1, productIds[4], 5, 32000.00);
  insertPOItem.run(po1, productIds[7], 20, 3200.00);

  const po2 = insertPO.run('PO-2024-002', s2, 'approved', 'Furniture order - Godrej Interio', 420000.00, managerId, '2024-02-01 10:00:00').lastInsertRowid;
  insertPOItem.run(po2, productIds[5], 10, 18000.00);
  insertPOItem.run(po2, productIds[6], 3, 34000.00);
  insertPOItem.run(po2, productIds[16], 5, 9000.00);

  const po3 = insertPO.run('PO-2024-003', s4, 'pending', 'Safety supplies restock - Mahindra Logistics', 95000.00, staffId, '2024-03-01 11:00:00').lastInsertRowid;
  insertPOItem.run(po3, productIds[12], 100, 420.00);
  insertPOItem.run(po3, productIds[13], 30, 720.00);
  insertPOItem.run(po3, productIds[17], 200, 110.00);

  // Inventory Logs
  const insertLog = db.prepare(`INSERT INTO inventory_logs (action, entity, entity_id, user_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  insertLog.run('CREATE', 'product', productIds[0], adminId, JSON.stringify({ sku: 'SKU-LAP-001', quantity: 45 }), '2024-01-15 09:00:00');
  insertLog.run('STOCK_IN', 'stock_movement', 1, adminId, JSON.stringify({ product: 'Laptop Inspiron 15', quantity: 50 }), '2024-01-15 09:05:00');
  insertLog.run('LOGIN', 'user', adminId, adminId, JSON.stringify({ email: 'sivadandem7@warehouseiq.com' }), '2024-01-15 08:55:00');
  insertLog.run('CREATE', 'purchase_order', po1, adminId, JSON.stringify({ order_number: 'PO-2024-001', status: 'delivered' }), '2024-01-10 09:00:00');

  console.log('✅ Database seeded with Indian sample data');
}

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