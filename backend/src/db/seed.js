require('dotenv').config({ path: require('path').resolve(__dirname, '../../..', '.env') });
const bcrypt = require('bcryptjs');
const { initializeDatabase, getDb } = require('./init');

async function seed() {
  initializeDatabase();
  const db = getDb();

  console.log('🌱 Seeding database...');

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

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const managerHash = bcrypt.hashSync('Manager@123', 10);
  const staffHash = bcrypt.hashSync('Staff@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
  `);

  const adminId = insertUser.run('Admin User', 'admin@warehouseiq.com', adminHash, 'admin').lastInsertRowid;
  const managerId = insertUser.run('Jane Manager', 'manager@warehouseiq.com', managerHash, 'manager').lastInsertRowid;
  const staffId = insertUser.run('Bob Staff', 'staff@warehouseiq.com', staffHash, 'staff').lastInsertRowid;

  console.log('  ✓ Users seeded');

  // ── Warehouses ─────────────────────────────────────────────────────────────
  const insertWarehouse = db.prepare(`
    INSERT INTO warehouses (name, location, capacity, available_space, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const w1 = insertWarehouse.run('Main Warehouse', 'New York, NY', 10000, 6500, 'Primary distribution center').lastInsertRowid;
  const w2 = insertWarehouse.run('West Coast Hub', 'Los Angeles, CA', 8000, 3200, 'West coast distribution hub').lastInsertRowid;
  const w3 = insertWarehouse.run('South Depot', 'Dallas, TX', 5000, 4100, 'Southern regional depot').lastInsertRowid;

  console.log('  ✓ Warehouses seeded');

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, contact_person, phone, email, address)
    VALUES (?, ?, ?, ?, ?)
  `);

  const s1 = insertSupplier.run('TechParts Co.', 'Alice Thompson', '+1-555-0101', 'alice@techparts.com', '123 Industrial Ave, Chicago, IL').lastInsertRowid;
  const s2 = insertSupplier.run('GlobalSupply Inc.', 'Mark Johnson', '+1-555-0102', 'mark@globalsupply.com', '456 Commerce Blvd, Houston, TX').lastInsertRowid;
  const s3 = insertSupplier.run('ProElectronics Ltd.', 'Sarah Chen', '+1-555-0103', 'sarah@proelectronics.com', '789 Tech Park, San Jose, CA').lastInsertRowid;
  const s4 = insertSupplier.run('FastShip Logistics', 'David Kim', '+1-555-0104', 'david@fastship.com', '321 Harbor Rd, Seattle, WA').lastInsertRowid;
  const s5 = insertSupplier.run('MegaTools Corp.', 'Linda Wilson', '+1-555-0105', 'linda@megatools.com', '654 Factory St, Detroit, MI').lastInsertRowid;

  console.log('  ✓ Suppliers seeded');

  // ── Products ───────────────────────────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category, quantity, price, warehouse_id, supplier_id, min_stock_threshold, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['Laptop Pro 15"', 'SKU-LAP-001', 'Electronics', 45, 1299.99, w1, s3, 10, 'High-performance laptop'],
    ['Wireless Mouse', 'SKU-MOU-002', 'Electronics', 120, 29.99, w1, s3, 20, 'Ergonomic wireless mouse'],
    ['USB-C Hub 7-port', 'SKU-HUB-003', 'Electronics', 8, 79.99, w2, s3, 15, '7-port USB-C hub'],
    ['Mechanical Keyboard', 'SKU-KEY-004', 'Electronics', 60, 149.99, w1, s1, 10, 'RGB mechanical keyboard'],
    ['Monitor 27" 4K', 'SKU-MON-005', 'Electronics', 25, 599.99, w1, s3, 5, '4K UHD display monitor'],
    ['Office Chair Pro', 'SKU-CHR-006', 'Furniture', 18, 349.99, w3, s2, 5, 'Ergonomic office chair'],
    ['Standing Desk', 'SKU-DSK-007', 'Furniture', 12, 699.99, w3, s2, 3, 'Height-adjustable standing desk'],
    ['Webcam 1080p', 'SKU-CAM-008', 'Electronics', 55, 89.99, w2, s3, 15, 'HD webcam with mic'],
    ['Power Strip 6-outlet', 'SKU-PWR-009', 'Electronics', 200, 24.99, w1, s1, 30, 'Surge protected power strip'],
    ['Headset Noise-Cancel', 'SKU-HST-010', 'Electronics', 40, 199.99, w2, s3, 10, 'Active noise cancelling headset'],
    ['Label Printer', 'SKU-LBL-011', 'Office', 22, 119.99, w1, s5, 5, 'Thermal label printer'],
    ['Barcode Scanner', 'SKU-BAR-012', 'Office', 35, 89.99, w1, s5, 10, 'Wireless barcode scanner'],
    ['Safety Gloves L', 'SKU-GLV-013', 'Safety', 150, 12.99, w3, s4, 50, 'Heavy-duty safety gloves'],
    ['Hard Hat Yellow', 'SKU-HAT-014', 'Safety', 80, 19.99, w3, s4, 20, 'ANSI-certified hard hat'],
    ['Forklift Battery', 'SKU-BAT-015', 'Equipment', 6, 899.99, w2, s5, 3, 'Industrial forklift battery'],
    ['Pallet Jack 5500lb', 'SKU-PAL-016', 'Equipment', 4, 299.99, w2, s5, 2, 'Manual pallet jack'],
    ['Shelving Unit 5-tier', 'SKU-SHV-017', 'Furniture', 30, 189.99, w3, s2, 5, 'Heavy-duty shelving unit'],
    ['Packaging Tape 36-pk', 'SKU-TAP-018', 'Supplies', 500, 2.99, w1, s4, 100, 'Heavy-duty packaging tape'],
    ['Bubble Wrap 100ft', 'SKU-BUB-019', 'Supplies', 75, 19.99, w1, s4, 20, 'Protective bubble wrap roll'],
    ['Fire Extinguisher', 'SKU-FIR-020', 'Safety', 3, 79.99, w3, s4, 5, 'ABC dry chemical extinguisher'],
  ];

  const productIds = products.map(p => insertProduct.run(...p).lastInsertRowid);

  console.log('  ✓ Products seeded');

  // ── Stock Movements ────────────────────────────────────────────────────────
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (product_id, type, quantity, supplier_id, user_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const movementData = [
    [productIds[0], 'IN', 50, s3, adminId, 'Initial stock - Laptop Pro', '2024-01-15 09:00:00'],
    [productIds[0], 'OUT', 5, null, staffId, 'Shipped to customer #1001', '2024-01-20 11:30:00'],
    [productIds[1], 'IN', 150, s3, managerId, 'Bulk purchase Q1', '2024-01-16 10:00:00'],
    [productIds[1], 'OUT', 30, null, staffId, 'Office restock - Floor 2', '2024-02-01 14:00:00'],
    [productIds[2], 'IN', 20, s3, adminId, 'New product arrival', '2024-02-05 09:00:00'],
    [productIds[2], 'OUT', 12, null, staffId, 'Dispatched to IT dept', '2024-02-10 15:00:00'],
    [productIds[3], 'IN', 70, s1, managerId, 'Q1 keyboard stock', '2024-01-18 10:00:00'],
    [productIds[3], 'OUT', 10, null, staffId, 'Issued to dev team', '2024-02-12 11:00:00'],
    [productIds[4], 'IN', 30, s3, adminId, 'Monitor batch A', '2024-01-20 09:30:00'],
    [productIds[4], 'OUT', 5, null, managerId, 'Manager office setup', '2024-02-15 10:00:00'],
    [productIds[12], 'IN', 200, s4, staffId, 'Safety gloves restock', '2024-02-01 08:00:00'],
    [productIds[12], 'OUT', 50, null, staffId, 'Q1 safety issue', '2024-02-20 09:00:00'],
    [productIds[17], 'IN', 600, s4, managerId, 'Bulk tape order', '2024-01-25 11:00:00'],
    [productIds[17], 'OUT', 100, null, staffId, 'Monthly packing usage', '2024-02-28 16:00:00'],
    [productIds[19], 'OUT', 2, null, adminId, 'Fire safety audit - replaced', '2024-03-01 10:00:00'],
  ];

  movementData.forEach(m => insertMovement.run(...m));
  console.log('  ✓ Stock movements seeded');

  // ── Purchase Orders ────────────────────────────────────────────────────────
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (order_number, supplier_id, status, notes, total_amount, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPOItem = db.prepare(`
    INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
    VALUES (?, ?, ?, ?)
  `);

  const po1 = insertPO.run('PO-2024-001', s3, 'delivered', 'Q1 Electronics restock', 8999.50, adminId, '2024-01-10 09:00:00').lastInsertRowid;
  insertPOItem.run(po1, productIds[0], 10, 1150.00);
  insertPOItem.run(po1, productIds[4], 5, 550.00);
  insertPOItem.run(po1, productIds[7], 20, 80.00);

  const po2 = insertPO.run('PO-2024-002', s2, 'approved', 'Furniture order for new office', 5249.85, managerId, '2024-02-01 10:00:00').lastInsertRowid;
  insertPOItem.run(po2, productIds[5], 10, 320.00);
  insertPOItem.run(po2, productIds[6], 3, 650.00);
  insertPOItem.run(po2, productIds[16], 5, 175.00);

  const po3 = insertPO.run('PO-2024-003', s4, 'pending', 'Safety supplies restock', 1499.50, staffId, '2024-03-01 11:00:00').lastInsertRowid;
  insertPOItem.run(po3, productIds[12], 100, 12.00);
  insertPOItem.run(po3, productIds[13], 30, 18.00);
  insertPOItem.run(po3, productIds[17], 200, 2.50);

  console.log('  ✓ Purchase orders seeded');

  // ── Inventory Logs ────────────────────────────────────────────────────────
  const insertLog = db.prepare(`
    INSERT INTO inventory_logs (action, entity, entity_id, user_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertLog.run('CREATE', 'product', productIds[0], adminId, JSON.stringify({ sku: 'SKU-LAP-001', quantity: 45 }), '2024-01-15 09:00:00');
  insertLog.run('STOCK_IN', 'stock_movement', 1, adminId, JSON.stringify({ product: 'Laptop Pro 15"', quantity: 50 }), '2024-01-15 09:05:00');
  insertLog.run('LOGIN', 'user', adminId, adminId, JSON.stringify({ email: 'admin@warehouseiq.com' }), '2024-01-15 08:55:00');
  insertLog.run('CREATE', 'purchase_order', po1, adminId, JSON.stringify({ order_number: 'PO-2024-001', status: 'delivered' }), '2024-01-10 09:00:00');
  insertLog.run('UPDATE', 'product', productIds[2], managerId, JSON.stringify({ sku: 'SKU-HUB-003', field: 'quantity' }), '2024-02-10 15:00:00');

  console.log('  ✓ Inventory logs seeded');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:   admin@warehouseiq.com   / Admin@123');
  console.log('  Manager: manager@warehouseiq.com / Manager@123');
  console.log('  Staff:   staff@warehouseiq.com   / Staff@123');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
