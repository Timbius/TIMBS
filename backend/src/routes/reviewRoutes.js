const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const {
  createReview,
  updateReview,
  deleteReview,
  getMyReviews
} = require('../controllers/reviewController');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  [
    body('recordId').isInt({ min: 1 }).withMessage('recordId is required'),
    body('rating')
      .optional({ nullable: true })
      .custom((value) => value === '' || (Number(value) >= 1 && Number(value) <= 5))
      .withMessage('rating must be 1..5')
  ],
  createReview
);

router.get('/my', authMiddleware, getMyReviews);
router.put(
  '/:id',
  authMiddleware,
  [
    body('rating')
      .optional({ nullable: true })
      .custom((value) => value === '' || (Number(value) >= 1 && Number(value) <= 5))
      .withMessage('rating must be 1..5')
  ],
  updateReview
);
router.delete('/:id', authMiddleware, deleteReview);

module.exports = router;
