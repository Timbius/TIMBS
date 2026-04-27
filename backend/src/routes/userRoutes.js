const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { getMe, updateMe, listUsers, deleteUser } = require('../controllers/userController');

const router = express.Router();

const profileValidation = [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('avatarUrl')
    .optional({ nullable: true })
    .isLength({ max: 2_000_000 })
    .withMessage('Avatar payload is too large')
];

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, profileValidation, updateMe);
router.get('/', authMiddleware, adminMiddleware, listUsers);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

module.exports = router;
