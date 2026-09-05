const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/bookmarks', authenticateToken, vaultController.getBookmarks);
router.get('/downloads', authenticateToken, vaultController.getDownloads);
router.get('/uploads', authenticateToken, vaultController.getMyUploads);

module.exports = router;
