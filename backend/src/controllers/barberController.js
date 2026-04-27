const Barber = require('../models/BarberModel');

const getAllBarbers = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      specialty: req.query.specialty,
      minRating: req.query.minRating,
      sort: req.query.sort,
      top: req.query.top
    };
    const barbers = await Barber.findAll(filters);
    res.json(barbers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBarberById = async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) return res.status(404).json({ message: 'Barber not found' });
    res.json(barber);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBarberServices = async (req, res) => {
  try {
    const services = await Barber.findServices(req.params.id);
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBarberReviews = async (req, res) => {
  try {
    const reviews = await Barber.findReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBarber = async (req, res) => {
  try {
    const { name, specialty, experienceYears, rating, bio, imageUrl } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const id = await Barber.create({ name, specialty, experienceYears, rating, bio, imageUrl });
    const barber = await Barber.findById(id);
    res.status(201).json(barber);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBarber = async (req, res) => {
  try {
    const exists = await Barber.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Barber not found' });

    const updated = await Barber.update(req.params.id, req.body);
    if (!updated) return res.status(400).json({ message: 'Failed to update barber' });

    const barber = await Barber.findById(req.params.id);
    res.json(barber);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBarber = async (req, res) => {
  try {
    const exists = await Barber.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Barber not found' });
    const deleted = await Barber.delete(req.params.id);
    if (!deleted) return res.status(400).json({ message: 'Failed to delete barber' });
    res.json({ message: 'Barber deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllBarbers,
  getBarberById,
  getBarberServices,
  getBarberReviews,
  createBarber,
  updateBarber,
  deleteBarber
};
