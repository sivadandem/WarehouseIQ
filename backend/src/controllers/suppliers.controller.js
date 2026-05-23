const { getDb } = require('../db/init');
const { logAction } = require('../middleware/logger');

const getAll = (req, res, next) => {
  try {
    const db = getDb();
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    const total = db.prepare(`SELECT COUNT(*) as count FROM suppliers WHERE name LIKE ? OR contact_person LIKE ?`).get(like, like).count;
    const suppliers = db.prepare(`
      SELECT * FROM suppliers WHERE name LIKE ? OR contact_person LIKE ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(like, like, parseInt(limit), offset);

    res.json({ success: true, data: suppliers, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

const getOne = (req, res, next) => {
  try {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
};

const create = (req, res, next) => {
  try {
    const db = getDb();
    const { name, contact_person, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });

    const result = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, contact_person || null, phone || null, email || null, address || null);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    logAction('CREATE', 'supplier', supplier.id, req.user.id, { name });
    res.status(201).json({ success: true, message: 'Supplier created.', data: supplier });
  } catch (err) { next(err); }
};

const update = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Supplier not found.' });

    const { name, contact_person, phone, email, address, is_active } = req.body;
    db.prepare(`
      UPDATE suppliers SET
        name = COALESCE(?, name), contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone), email = COALESCE(?, email),
        address = COALESCE(?, address), is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name||null, contact_person||null, phone||null, email||null, address||null, is_active!==undefined?is_active:null, id);

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    logAction('UPDATE', 'supplier', parseInt(id), req.user.id, { changes: req.body });
    res.json({ success: true, message: 'Supplier updated.', data: updated });
  } catch (err) { next(err); }
};

const remove = (req, res, next) => {
  try {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    logAction('DELETE', 'supplier', parseInt(req.params.id), req.user.id, { name: supplier.name });
    res.json({ success: true, message: 'Supplier deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, remove };
