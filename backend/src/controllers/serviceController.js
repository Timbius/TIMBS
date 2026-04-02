const Service = require('../models/ServiceModel');

// GET /api/services - получить все услуги
const getAllServices = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      popular: req.query.popular,
      sort: req.query.sort
    };
    const services = await Service.findAll(filters);
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/services/:id - получить одну услугу
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/services - создать услугу (только авторизованные)
const createService = async (req, res) => {
  try {
    const { title, description, price, imageUrl, category, isPopular } = req.body;
    
    if (!title || !price) {
      return res.status(400).json({ message: 'Title and price are required' });
    }

    const newId = await Service.create({ title, description, price, imageUrl, category, isPopular });
    const newService = await Service.findById(newId);
    res.status(201).json(newService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/services/:id - обновить услугу (только авторизованные)
const updateService = async (req, res) => {
  try {
    const serviceExists = await Service.findById(req.params.id);
    if (!serviceExists) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const { title, description, price, imageUrl, category, isPopular } = req.body;
    const updated = await Service.update(req.params.id, { title, description, price, imageUrl, category, isPopular });
    
    if (updated) {
      const updatedService = await Service.findById(req.params.id);
      res.json(updatedService);
    } else {
      res.status(400).json({ message: 'Failed to update service' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/services/:id - удалить услугу (только авторизованные)
const deleteService = async (req, res) => {
  try {
    const serviceExists = await Service.findById(req.params.id);
    if (!serviceExists) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const deleted = await Service.delete(req.params.id);
    if (deleted) {
      res.json({ message: 'Service deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete service' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};