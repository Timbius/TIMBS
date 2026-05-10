const express = require('express');
const { body } = require('express-validator');
const {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  getMe,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Укажите корректный email'),
  body('phone').matches(/^\+375\d{9}$/).withMessage('Телефон должен быть в формате +375XXXXXXXXX'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов')
    .matches(/\p{L}/u)
    .withMessage('Пароль должен содержать хотя бы одну букву'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442')
];

const loginValidation = [
  body('email').isEmail().withMessage('Укажите корректный email'),
  body('password').notEmpty().withMessage('Введите пароль')
];

router.post('/register', registerValidation, register);
router.post('/verify-email', [
  body('email').isEmail().withMessage('Укажите корректный email'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Код должен содержать 6 символов')
], verifyEmail);
router.post('/resend-verification-code', [body('email').isEmail().withMessage('Укажите корректный email')], resendVerificationCode);
router.post('/login', loginValidation, login);
router.post('/forgot-password', [body('email').isEmail().withMessage('Укажите корректный email')], forgotPassword);
router.post('/reset-password', [
  body('email').isEmail().withMessage('Укажите корректный email'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Код должен содержать 6 символов'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  body('passwordConfirm').custom((value, { req }) => value === req.body.password).withMessage('Пароли не совпадают')
], resetPassword);
router.get('/me', authMiddleware, getMe);

module.exports = router;
