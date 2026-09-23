const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const metaRoutes = require('./routes/metaRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || '*',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes); // colleges, branches, etc
app.use('/api/resources', resourceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/my-vault', vaultRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for root or SPA paths
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Frontend accessible at:`);
    console.log(`- Home:     http://localhost:${PORT}/index.html`);
    console.log(`- B.Tech:   http://localhost:${PORT}/btech.html`);
    console.log(`- M.Tech:   http://localhost:${PORT}/mtech.html`);
    console.log(`- PhD:      http://localhost:${PORT}/phd.html`);
    console.log(`- Upload:   http://localhost:${PORT}/upload.html`);
    console.log(`- Login:    http://localhost:${PORT}/login.html`);
    console.log(`- Register: http://localhost:${PORT}/register.html`);
});
