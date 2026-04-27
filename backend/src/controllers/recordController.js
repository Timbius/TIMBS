const { validationResult } = require('express-validator');
const Record = require('../models/RecordModel');

const createRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { barberId, serviceId, appointmentAt, comment } = req.body;
    const id = await Record.create({
      userId: req.userId,
      barberId,
      serviceId,
      appointmentAt,
      comment
    });
    res.status(201).json({ message: 'Запись успешно создана', recordId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyRecords = async (req, res) => {
  try {
    const records = await Record.findByUser(req.userId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cancelMyRecord = async (req, res) => {
  try {
    const cancelled = await Record.cancel(req.params.id, req.userId);
    if (!cancelled) return res.status(400).json({ message: 'Нельзя отменить запись' });
    res.json({ message: 'Запись отменена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const completeMyRecord = async (req, res) => {
  try {
    const completed = await Record.complete(req.params.id, req.userId);
    if (!completed) return res.status(400).json({ message: 'Нельзя завершить запись' });
    res.json({ message: 'Запись отмечена как посещенная' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSchedule = async (req, res) => {
  try {
    const { barber, date } = req.query;
    if (!barber || !date) return res.status(400).json({ message: 'barber and date are required' });
    const schedule = await Record.findSchedule(barber, date);
    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRecords = async (_req, res) => {
  try {
    const records = await Record.findAll();
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRecordByAdmin = async (req, res) => {
  try {
    const exists = await Record.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Запись не найдена' });

    const { userId, barberId, serviceId, appointmentAt, comment, status } = req.body;
    const allowedStatuses = ['active', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updated = await Record.updateByAdmin(req.params.id, {
      userId: Number(userId),
      barberId: Number(barberId),
      serviceId: Number(serviceId),
      appointmentAt,
      comment,
      status
    });

    if (!updated) return res.status(400).json({ message: 'Не удалось обновить запись' });
    res.json({ message: 'Запись обновлена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRecordByAdmin = async (req, res) => {
  try {
    const exists = await Record.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Запись не найдена' });

    const deleted = await Record.deleteByAdmin(req.params.id);
    if (!deleted) return res.status(400).json({ message: 'Не удалось удалить запись' });
    res.json({ message: 'Запись удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRecord,
  getMyRecords,
  cancelMyRecord,
  completeMyRecord,
  getSchedule,
  getAllRecords,
  updateRecordByAdmin,
  deleteRecordByAdmin
};
