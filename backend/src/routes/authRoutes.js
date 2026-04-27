const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, forgotPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/[A-Za-zА-Яа-я]/)
    .withMessage('Password must contain at least one letter'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', [body('email').isEmail().withMessage('Please provide a valid email')], forgotPassword);
router.get('/me', authMiddleware, getMe);

module.exports = router;
