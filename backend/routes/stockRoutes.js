
const express = require('express');
const { getStocks, checkLowStock, addStock, updateStock } = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/get').get(protect, getStocks);
router.route('/add').post(protect, addStock);
router.route('/check').get(protect, checkLowStock);
router.route('/:id').put(protect, updateStock);

module.exports = router;
