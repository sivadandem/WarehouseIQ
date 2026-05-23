const { getDb } = require('../db/init');
const { validationResult } = require('express-validator');

const logAction = (action, entity, entityId, userId, details) => {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO inventory_logs (action, entity, entity_id, user_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(action, entity, entityId, userId, JSON.stringify(details));
  } catch (e) {
    console.error('Log error:', e.message);
  }
};

module.exports = { logAction };
