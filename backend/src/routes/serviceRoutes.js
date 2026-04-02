const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');

const router = express.Router();

// Публичные маршруты (доступны всем)
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Защищенные маршруты (требуют авторизации)
router.post('/', authMiddleware, createService);
router.put('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

module.exports = router;