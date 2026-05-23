const { getDb } = require('../db/init');
const bcrypt = require('bcryptjs');
const { logAction } = require('../middleware/logger');

const getAll = (req, res, next) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

const create = (req, res, next) => {
  try {
    const db = getDb();
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ success: false, message: 'Email already exists.' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`)
      .run(name, email.toLowerCase(), hash, role || 'staff');
    const user = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    logAction('CREATE', 'user', user.id, req.user.id, { email });
    res.status(201).json({ success: true, message: 'User created.', data: user });
  } catch (err) { next(err); }
};

const update = (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, role, is_active } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    db.prepare(`UPDATE users SET name = COALESCE(?,name), role = COALESCE(?,role), is_active = COALESCE(?,is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(name||null, role||null, is_active!==undefined?is_active:null, id);
    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.json({ success: true, message: 'User updated.', data: updated });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update };
