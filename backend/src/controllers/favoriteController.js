const Favorite = require('../models/FavoriteModel');
const Service = require('../models/ServiceModel');

const toggleFavorite = async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    const result = await Favorite.toggle(req.userId, req.params.serviceId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.listByUser(req.userId);
    res.json(favorites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getMyFavoriteIds = async (req, res) => {
  try {
    const ids = await Favorite.listServiceIdsByUser(req.userId);
    res.json(ids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

module.exports = {
  toggleFavorite,
  getMyFavorites,
  getMyFavoriteIds
};
