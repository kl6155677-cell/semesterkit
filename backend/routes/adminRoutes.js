const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

const fs = require('fs');

// Storage for Media Library uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
}

const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'media_' + uniqueSuffix + path.extname(file.originalname));
    }
});
const mediaUpload = multer({
    storage: mediaStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Protect all admin routes
router.use(authenticateToken, authorizeAdmin);

// Dashboard & Moderation
router.get('/stats', adminController.getDashboardStats);
router.get('/pending', adminController.getPendingResources);
router.post('/moderate/:id', adminController.moderateResource);

// All Resources Inventory
router.get('/resources', adminController.getAllResources);
router.put('/resources/:id', adminController.updateResource);
router.delete('/resources/:id', adminController.deleteResource);

// User Management
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);

// CMS: Testimonials
router.get('/testimonials', adminController.getTestimonials);
router.post('/testimonials', adminController.addTestimonial);
router.put('/testimonials/:id', adminController.updateTestimonial);
router.delete('/testimonials/:id', adminController.deleteTestimonial);

// CMS: Static Pages
router.get('/static-pages', adminController.getStaticPages);
router.post('/static-pages', adminController.addStaticPage);
router.put('/static-pages/:id', adminController.updateStaticPage);
router.delete('/static-pages/:id', adminController.deleteStaticPage);

// CMS: Footer Links
router.get('/footer-links', adminController.getFooterLinks);
router.post('/footer-links', adminController.addFooterLink);
router.put('/footer-links/:id', adminController.updateFooterLink);
router.delete('/footer-links/:id', adminController.deleteFooterLink);

// Media Library
router.get('/media', adminController.getMedia);
router.post('/media', (req, res, next) => {
    mediaUpload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Error uploading media file' });
        }
        next();
    });
}, adminController.addMedia);
router.delete('/media/:id', adminController.deleteMedia);

// Analytics
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
