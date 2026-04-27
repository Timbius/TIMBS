const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  toggleFavorite,
  getMyFavorites,
  getMyFavoriteIds
} = require('../controllers/favoriteController');

const router = express.Router();

router.get('/my', authMiddleware, getMyFavorites);
router.get('/my/ids', authMiddleware, getMyFavoriteIds);
router.post('/services/:serviceId/toggle', authMiddleware, toggleFavorite);

module.exports = router;
