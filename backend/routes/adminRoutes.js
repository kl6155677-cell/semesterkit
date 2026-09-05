const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/pending', adminController.getPendingResources);
router.post('/moderate/:id', adminController.moderateResource);

module.exports = router;
