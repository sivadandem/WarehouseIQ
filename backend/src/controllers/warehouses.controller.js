const { getDb } = require('../db/init');
const { logAction } = require('../middleware/logger');

const getAll = (req, res, next) => {
  try {
    const db = getDb();
    const warehouses = db.prepare(`
      SELECT w.*, COUNT(p.id) as product_count
      FROM warehouses w
      LEFT JOIN products p ON w.id = p.warehouse_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `).all();
    res.json({ success: true, data: warehouses });
  } catch (err) { next(err); }
};

const getOne = (req, res, next) => {
  try {
    const db = getDb();
    const w = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, data: w });
  } catch (err) { next(err); }
};

const create = (req, res, next) => {
  try {
    const db = getDb();
    const { name, location, capacity, available_space, description } = req.body;
    if (!name || !location) return res.status(400).json({ success: false, message: 'Name and location are required.' });

    const result = db.prepare(`
      INSERT INTO warehouses (name, location, capacity, available_space, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, location, capacity || 0, available_space !== undefined ? available_space : (capacity || 0), description || null);

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    logAction('CREATE', 'warehouse', warehouse.id, req.user.id, { name });
    res.status(201).json({ success: true, message: 'Warehouse created.', data: warehouse });
  } catch (err) { next(err); }
};

const update = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Warehouse not found.' });

    const { name, location, capacity, available_space, description } = req.body;
    db.prepare(`
      UPDATE warehouses SET
        name = COALESCE(?, name), location = COALESCE(?, location),
        capacity = COALESCE(?, capacity), available_space = COALESCE(?, available_space),
        description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name||null, location||null, capacity||null, available_space!==undefined?available_space:null, description||null, id);

    const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    logAction('UPDATE', 'warehouse', parseInt(id), req.user.id, { changes: req.body });
    res.json({ success: true, message: 'Warehouse updated.', data: updated });
  } catch (err) { next(err); }
};

const remove = (req, res, next) => {
  try {
    const db = getDb();
    const w = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    db.prepare('DELETE FROM warehouses WHERE id = ?').run(req.params.id);
    logAction('DELETE', 'warehouse', parseInt(req.params.id), req.user.id, { name: w.name });
    res.json({ success: true, message: 'Warehouse deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove };
