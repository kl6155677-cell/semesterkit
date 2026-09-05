const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResourceById);

// Optional auth for download (to track history)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        return authenticateToken(req, res, next);
    }
    next();
};

router.post('/:id/download', optionalAuth, resourceController.downloadResource);
router.post('/:id/bookmark', authenticateToken, resourceController.bookmarkResource);
router.post('/:id/feedback', resourceController.feedbackResource);

module.exports = router;
