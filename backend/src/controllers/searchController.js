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
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

module.exports = { searchGlobal };
