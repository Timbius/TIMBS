const { validationResult } = require('express-validator');
const Record = require('../models/RecordModel');

const isWithinSalonHours = (dateObj) => {
  const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
  return minutes >= 10 * 60 && minutes <= 21 * 60 + 30;
};

const isQuarterStep = (dateObj) => dateObj.getMinutes() % 15 === 0;

const createRecord = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { barberId, serviceId, comment } = req.body;
    const appointmentAtRaw = req.body.appointmentAt || req.body.date;
    const appointmentAt = new Date(appointmentAtRaw);

    if (Number.isNaN(appointmentAt.getTime())) {
      return res.status(400).json({ message: '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0430\u044f \u0434\u0430\u0442\u0430 \u0437\u0430\u043f\u0438\u0441\u0438' });
    }
    if (appointmentAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Cannot create record in the past' });
    }
    if (!isWithinSalonHours(appointmentAt)) {
      return res.status(400).json({ message: 'Salon accepts records from 10:00 to 21:30' });
    }
    if (!isQuarterStep(appointmentAt)) {
      return res.status(400).json({ message: 'Record must start at 15-minute step' });
    }

    const conflict = await Record.hasTimeConflict(Number(barberId), appointmentAt);
    if (conflict) {
      return res.status(409).json({ message: 'Selected slot is not available' });
    }

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
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getMyRecords = async (req, res) => {
  try {
    const records = await Record.findByUser(req.userId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const cancelMyRecord = async (req, res) => {
  try {
    const cancelled = await Record.cancel(req.params.id, req.userId);
    if (!cancelled) return res.status(400).json({ message: 'Cannot cancel record' });
    res.json({ message: 'Запись отменена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const completeMyRecord = async (req, res) => {
  try {
    const completed = await Record.complete(req.params.id, req.userId);
    if (!completed) return res.status(400).json({ message: 'Cannot complete record' });
    res.json({ message: 'Запись отмечена как посещенная' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
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
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getAllRecords = async (_req, res) => {
  try {
    const records = await Record.findAll();
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const updateRecordByAdmin = async (req, res) => {
  try {
    const exists = await Record.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Record not found' });

    const { userId, barberId, serviceId, comment, status } = req.body;
    const appointmentAtRaw = req.body.appointmentAt || req.body.date;
    const appointmentAt = new Date(appointmentAtRaw);

    if (Number.isNaN(appointmentAt.getTime())) {
      return res.status(400).json({ message: '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0430\u044f \u0434\u0430\u0442\u0430 \u0437\u0430\u043f\u0438\u0441\u0438' });
    }
    if (appointmentAt.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Cannot set record in the past' });
    }
    if (!isWithinSalonHours(appointmentAt)) {
      return res.status(400).json({ message: 'Salon accepts records from 10:00 to 21:30' });
    }
    if (!isQuarterStep(appointmentAt)) {
      return res.status(400).json({ message: 'Record must start at 15-minute step' });
    }

    const allowedStatuses = ['active', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус' });
    }

    const conflict = await Record.hasTimeConflict(Number(barberId), appointmentAt, Number(req.params.id));
    if (conflict) {
      return res.status(409).json({ message: 'Selected slot is not available' });
    }

    const updated = await Record.updateByAdmin(req.params.id, {
      userId: Number(userId),
      barberId: Number(barberId),
      serviceId: Number(serviceId),
      appointmentAt,
      comment,
      status
    });

    if (!updated) return res.status(400).json({ message: 'Failed to update record' });
    res.json({ message: 'Запись обновлена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const deleteRecordByAdmin = async (req, res) => {
  try {
    const exists = await Record.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: 'Record not found' });

    const deleted = await Record.deleteByAdmin(req.params.id);
    if (!deleted) return res.status(400).json({ message: 'Failed to delete record' });
    res.json({ message: 'Запись удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
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
