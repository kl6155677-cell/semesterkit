const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Local storage for reliability
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

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
