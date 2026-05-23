const router = require('express').Router();
const c = require('../controllers/products.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/categories', c.getCategories);
router.get('/', c.getAll);
router.get('/:id', c.getOne);
router.post('/', authorize('admin','manager'), c.create);
router.put('/:id', authorize('admin','manager'), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
