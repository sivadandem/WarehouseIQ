const router = require('express').Router();
const c = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/', c.getAll);
router.post('/', c.create);
router.put('/:id', c.update);

module.exports = router;
