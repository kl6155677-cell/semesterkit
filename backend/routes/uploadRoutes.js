const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Configure Cloudinary if URL is present in environment
let storage;
if (process.env.CLOUDINARY_URL) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'semesterkit_uploads',
            allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'zip', 'docx', 'doc', 'ppt', 'pptx']
        }
    });
} else {
    // Fallback for local development
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.pdf', '.doc', '.docx', '.zip', '.rar', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'].includes(ext)) {
            return cb(new Error('Only PDFs, DOCs, PPTs, ZIPs and images are allowed'));
        }
        cb(null, true);
    }
});

router.post('/', authenticateToken, upload.single('file'), uploadController.uploadResource);
router.post('/image', authenticateToken, upload.single('file'), uploadController.uploadImageOnly);

module.exports = router;
