const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// Settings & Public Data
router.get('/settings', metaController.getSettings);
router.get('/stats', metaController.getPublicStats);
router.get('/top-contributors', metaController.getTopContributors);
router.put('/settings', authenticateToken, authorizeAdmin, metaController.updateSettings);

// Colleges
router.get('/colleges', metaController.getColleges);
router.post('/colleges', authenticateToken, authorizeAdmin, metaController.addCollege);
router.put('/colleges/:id', authenticateToken, authorizeAdmin, metaController.updateCollege);
router.delete('/colleges/:id', authenticateToken, authorizeAdmin, metaController.deleteCollege);

// Branches
router.get('/branches', metaController.getBranches);
router.post('/branches', authenticateToken, authorizeAdmin, metaController.addBranch);
router.put('/branches/:id', authenticateToken, authorizeAdmin, metaController.updateBranch);
router.delete('/branches/:id', authenticateToken, authorizeAdmin, metaController.deleteBranch);

// Semesters
router.get('/semesters', metaController.getSemesters);
router.post('/semesters', authenticateToken, authorizeAdmin, metaController.addSemester);
router.put('/semesters/:id', authenticateToken, authorizeAdmin, metaController.updateSemester);
router.delete('/semesters/:id', authenticateToken, authorizeAdmin, metaController.deleteSemester);

// Subjects
router.get('/subjects', metaController.getSubjects);
router.post('/subjects', authenticateToken, authorizeAdmin, metaController.addSubject);
router.put('/subjects/:id', authenticateToken, authorizeAdmin, metaController.updateSubject);
router.delete('/subjects/:id', authenticateToken, authorizeAdmin, metaController.deleteSubject);

// Resource Types
router.get('/resource-types', metaController.getResourceTypes);
router.post('/resource-types', authenticateToken, authorizeAdmin, metaController.addResourceType);
router.put('/resource-types/:id', authenticateToken, authorizeAdmin, metaController.updateResourceType);
router.delete('/resource-types/:id', authenticateToken, authorizeAdmin, metaController.deleteResourceType);

module.exports = router;
