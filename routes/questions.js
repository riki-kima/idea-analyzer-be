const express = require('express');

const router = express.Router();

const { getQuestions, generatePDF } = require('../controllers/questions');

router.get('/questions', getQuestions);
router.post('/generate-pdf', generatePDF);

module.exports = router;
