const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const {
  createRecord,
  getMyRecords,
  cancelMyRecord,
  completeMyRecord,
  getSchedule,
  getAllRecords,
  updateRecordByAdmin,
  deleteRecordByAdmin
} = require('../controllers/recordController');

const router = express.Router();

const validateAppointment = body().custom((_, { req }) => {
  const value = req.body.appointmentAt || req.body.date;
  if (!value) throw new Error('appointmentAt or date is required');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('appointmentAt/date must be valid ISO date');
  return true;
});

const recordValidation = [
  body('barberId').isInt({ min: 1 }).withMessage('barberId is required'),
  body('serviceId').isInt({ min: 1 }).withMessage('serviceId is required'),
  validateAppointment
];

router.get('/schedule', getSchedule);
router.post('/', authMiddleware, recordValidation, createRecord);
router.get('/my', authMiddleware, getMyRecords);
router.delete('/:id', authMiddleware, cancelMyRecord);
router.patch('/:id/complete', authMiddleware, completeMyRecord);
router.get('/', authMiddleware, adminMiddleware, getAllRecords);
router.put('/:id', authMiddleware, adminMiddleware, recordValidation, updateRecordByAdmin);
router.delete('/:id/admin', authMiddleware, adminMiddleware, deleteRecordByAdmin);

module.exports = router;
