const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  getAllServices,
  getPopularServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');

const router = express.Router();

// Публичные маршруты (доступны всем)
router.get('/', getAllServices);
router.get('/popular', getPopularServices);
router.get('/:id', getServiceById);

// Защищенные маршруты (требуют авторизации администратора)
router.post('/', authMiddleware, adminMiddleware, createService);
router.put('/:id', authMiddleware, adminMiddleware, updateService);
router.delete('/:id', authMiddleware, adminMiddleware, deleteService);

module.exports = router;
