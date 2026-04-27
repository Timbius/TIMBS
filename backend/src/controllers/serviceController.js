const Service = require('../models/ServiceModel');

const getAllServices = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      popular: req.query.popular,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
    };
    const result = await Service.findAll(filters);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const barbers = await Service.findBarbers(req.params.id);
    res.json({ ...service, barbers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPopularServices = async (_req, res) => {
  try {
    const services = await Service.findPopular(3);
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description, price, durationMin, imageUrl, category, isPopular, barberIds } = req.body;

    if (!title || Number(price) <= 0) {
      return res.status(400).json({ message: 'Title and price are required' });
    }

    const newId = await Service.create({
      title,
      description,
      price,
      durationMin,
      imageUrl,
      category,
      isPopular
    });
    await Service.linkToBarbers(newId, Array.isArray(barberIds) ? barberIds : []);

    const newService = await Service.findById(newId);
    res.status(201).json(newService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateService = async (req, res) => {
  try {
    const serviceExists = await Service.findById(req.params.id);
    if (!serviceExists) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const { title, description, price, durationMin, imageUrl, category, isPopular, barberIds } = req.body;
    const updated = await Service.update(req.params.id, {
      title,
      description,
      price,
      durationMin,
      imageUrl,
      category,
      isPopular
    });

    if (Array.isArray(barberIds)) {
      await Service.linkToBarbers(req.params.id, barberIds);
    }

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
  getPopularServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
