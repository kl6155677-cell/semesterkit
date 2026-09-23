const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// Public CMS & Website Data
router.get('/settings', metaController.getSettings);
router.get('/stats', metaController.getPublicStats);
router.get('/top-contributors', metaController.getTopContributors);
router.get('/testimonials', metaController.getPublicTestimonials);
router.get('/footer', metaController.getPublicFooter);
router.get('/navigation', metaController.getPublicNavigation);
router.get('/pages/:slug', metaController.getStaticPageBySlug);
router.get('/programs', metaController.getPrograms);

// Admin-only Settings Update
router.put('/settings', authenticateToken, authorizeAdmin, metaController.updateSettings);

// Colleges (Public Read, Admin Write)
router.get('/colleges', metaController.getColleges);
router.post('/colleges', authenticateToken, authorizeAdmin, metaController.addCollege);
router.put('/colleges/:id', authenticateToken, authorizeAdmin, metaController.updateCollege);
router.delete('/colleges/:id', authenticateToken, authorizeAdmin, metaController.deleteCollege);

// Branches (Public Read, Admin Write)
router.get('/branches', metaController.getBranches);
router.post('/branches', authenticateToken, authorizeAdmin, metaController.addBranch);
router.put('/branches/:id', authenticateToken, authorizeAdmin, metaController.updateBranch);
router.delete('/branches/:id', authenticateToken, authorizeAdmin, metaController.deleteBranch);

// Semesters (Public Read, Admin Write)
router.get('/semesters', metaController.getSemesters);
router.post('/semesters', authenticateToken, authorizeAdmin, metaController.addSemester);
router.put('/semesters/:id', authenticateToken, authorizeAdmin, metaController.updateSemester);
router.delete('/semesters/:id', authenticateToken, authorizeAdmin, metaController.deleteSemester);

// Subjects (Public Read, Admin Write)
router.get('/subjects', metaController.getSubjects);
router.post('/subjects', authenticateToken, authorizeAdmin, metaController.addSubject);
router.put('/subjects/:id', authenticateToken, authorizeAdmin, metaController.updateSubject);
router.delete('/subjects/:id', authenticateToken, authorizeAdmin, metaController.deleteSubject);

// Resource Types (Public Read, Admin Write)
router.get('/resource-types', metaController.getResourceTypes);
router.post('/resource-types', authenticateToken, authorizeAdmin, metaController.addResourceType);
router.put('/resource-types/:id', authenticateToken, authorizeAdmin, metaController.updateResourceType);
router.delete('/resource-types/:id', authenticateToken, authorizeAdmin, metaController.deleteResourceType);

module.exports = router;
