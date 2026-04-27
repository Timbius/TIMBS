const Service = require('../models/ServiceModel');
const Barber = require('../models/BarberModel');

const searchGlobal = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
      return res.status(400).json({ message: 'Минимум 2 символа для поиска' });
    }

    const [services, barbers] = await Promise.all([
      Service.search(query),
      Barber.findAll({ search: query, sort: 'rating_desc' })
    ]);

    res.json({
      query,
      services,
      barbers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { searchGlobal };
