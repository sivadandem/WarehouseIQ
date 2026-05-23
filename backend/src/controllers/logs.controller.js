const { getDb } = require('../db/init');

const getLogs = (req, res, next) => {
  try {
    const db = getDb();
    const { entity, action, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['1=1'];
    let params = [];
    if (entity) { conditions.push('il.entity = ?'); params.push(entity); }
    if (action) { conditions.push('il.action = ?'); params.push(action); }
    const where = conditions.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) as count FROM inventory_logs il WHERE ${where}`).get(...params).count;
    const logs = db.prepare(`
      SELECT il.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM inventory_logs il
      LEFT JOIN users u ON il.user_id = u.id
      WHERE ${where}
      ORDER BY il.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
};

module.exports = { getLogs };
