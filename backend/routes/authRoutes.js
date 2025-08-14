
const express = require('express');
const { registerAdmin, loginAdmin, getadmin, updateAdmin, getAdmins } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile', protect, getadmin);
router.put('/profile', protect, updateAdmin);
router.get('/list', protect, getAdmins);


module.exports = router;
