const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/colleges', metaController.getColleges);
router.get('/branches', metaController.getBranches);
router.get('/semesters', metaController.getSemesters);
router.get('/subjects', metaController.getSubjects);
router.get('/resource-types', metaController.getResourceTypes);

module.exports = router;
