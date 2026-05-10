const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { getMe, updateMe, listUsers, deleteUser, getMyRecordsViaUsers } = require('../controllers/userController');

const router = express.Router();

const profileValidation = [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Укажите корректный email'),
  body('phone')
    .matches(/^\+375\d{9}$/)
    .withMessage('Телефон должен быть в формате +375XXXXXXXXX'),
  body('avatarUrl')
    .optional({ nullable: true })
    .isLength({ max: 2_000_000 })
    .withMessage('Avatar payload is too large')
];

router.get('/me', authMiddleware, getMe);
router.get('/me/records', authMiddleware, getMyRecordsViaUsers);
router.put('/me', authMiddleware, profileValidation, updateMe);
router.get('/', authMiddleware, adminMiddleware, listUsers);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

module.exports = router;
