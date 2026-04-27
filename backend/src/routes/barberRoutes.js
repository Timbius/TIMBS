const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getAllBarbers,
  getBarberById,
  getBarberServices,
  getBarberReviews,
  createBarber,
  updateBarber,
  deleteBarber
} = require('../controllers/barberController');

const router = express.Router();

router.get('/', getAllBarbers);
router.get('/:id', getBarberById);
router.get('/:id/services', getBarberServices);
router.get('/:id/reviews', getBarberReviews);

router.post('/', authMiddleware, adminMiddleware, createBarber);
router.put('/:id', authMiddleware, adminMiddleware, updateBarber);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBarber);

module.exports = router;
