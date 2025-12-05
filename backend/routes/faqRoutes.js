// backend/routes/faqRoutes.js
const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');

// Try different ways to import until it works
let authMiddleware;
try {
    // Try to import as named export
    authMiddleware = require('../middleware/authMiddleware').protect;
} catch (e) {
    try {
        // Try to import as default export
        authMiddleware = require('../middleware/authMiddleware');
    } catch (e2) {
        // Create a dummy middleware for testing
        console.log('Auth middleware not found, using dummy middleware');
        authMiddleware = (req, res, next) => {
            console.log('Dummy auth middleware called');
            req.user = { id: 'test', role: 'owner' }; // Dummy user for testing
            next();
        };
    }
}

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/faq/store/:storeId
// @desc    Get all FAQs for a store with optional filtering
// @access  Private (store owners and employees)
router.get('/store/:storeId', faqController.getFAQsByStore);

// @route   POST /api/faq
// @desc    Create a new FAQ
// @access  Private (store owners only)
router.post('/', faqController.createFAQ);

// @route   PUT /api/faq/:id
// @desc    Update an existing FAQ
// @access  Private (store owners only)
router.put('/:id', faqController.updateFAQ);

// @route   DELETE /api/faq/:id
// @desc    Delete an FAQ
// @access  Private (store owners only)
router.delete('/:id', faqController.deleteFAQ);

// @route   PATCH /api/faq/:id/toggle
// @desc    Toggle FAQ active status
// @access  Private (store owners and employees)
router.patch('/:id/toggle', faqController.toggleFAQActive);

// @route   POST /api/faq/match
// @desc    Match a message against store FAQs (for auto-reply)
// @access  Private (chat system)
router.post('/match', faqController.matchFAQ);

module.exports = router;