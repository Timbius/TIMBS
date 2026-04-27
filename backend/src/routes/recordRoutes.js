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

const recordValidation = [
  body('barberId').isInt({ min: 1 }).withMessage('barberId is required'),
  body('serviceId').isInt({ min: 1 }).withMessage('serviceId is required'),
  body('appointmentAt').isISO8601().withMessage('appointmentAt must be ISO date')
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
