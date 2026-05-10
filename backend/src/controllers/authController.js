const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/UserModel');
const { sendMail } = require('../utils/mailer');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
const isByPhone = (value) => /^\+375\d{9}$/.test(String(value || ''));
const makeCode = () => crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
const codeHash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
const codeExpiresAt = (minutes = 15) => new Date(Date.now() + minutes * 60 * 1000);

function sendMailErrorResponse(res, error) {
  if (error && error.message === 'EMAIL_TRANSPORT_NOT_CONFIGURED') {
    return res.status(500).json({ message: 'Не настроена отправка email (SMTP). Проверьте SMTP-переменные в backend/.env' });
  }
  if (error && error.message === 'EMAIL_SEND_FAILED') {
    const details = [error.mailCode, error.mailResponse].filter(Boolean).join(' | ');
    if (String(error.mailCode || '').toUpperCase() === 'ESOCKET') {
      return res.status(500).json({
        message: 'Не удалось подключиться к SMTP Gmail. Проверьте SMTP_HOST/SMTP_PORT/SMTP_SECURE, интернет и блокировку порта 465/587.',
        details
      });
    }
    return res.status(500).json({
      message: 'Не удалось отправить письмо. Для Gmail нужен App Password (16 символов), а не пароль от почты.',
      details
    });
  }
  return null;
}

async function sendVerifyEmail(email, code) {
  const subject = 'Подтверждение email — Barber Factory';
  const text = `Ваш код подтверждения: ${code}. Код действует 15 минут.`;
  const html = `<p>Ваш код подтверждения: <b>${code}</b></p><p>Код действует 15 минут.</p>`;
  await sendMail({ to: email, subject, text, html });
}

async function sendResetEmail(email, code) {
  const subject = 'Восстановление пароля — Barber Factory';
  const text = `Ваш код для восстановления пароля: ${code}. Код действует 15 минут.`;
  const html = `<p>Ваш код для восстановления пароля: <b>${code}</b></p><p>Код действует 15 минут.</p>`;
  await sendMail({ to: email, subject, text, html });
}

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password, passwordConfirm } = req.body;

  try {
    if (!/\p{L}/u.test(String(password || ''))) {
      return res.status(400).json({ message: 'Пароль должен содержать хотя бы одну букву' });
    }
    if (String(password || '').length < 6) {
      return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' });
    }
    if (passwordConfirm !== password) {
      return res.status(400).json({ message: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442' });
    }
    if (!isByPhone(phone)) {
      return res.status(400).json({ message: '\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0432 \u0444\u043e\u0440\u043c\u0430\u0442\u0435 +375XXXXXXXXX' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c email \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442' });
    }
    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ message: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442' });
    }
    const existingPendingPhone = await User.findPendingByPhone(phone);
    if (existingPendingPhone && existingPendingPhone.email !== email) {
      return res.status(400).json({ message: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441 \u0442\u0430\u043a\u0438\u043c \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const code = makeCode();
    await User.upsertPendingRegistration({
      name,
      email,
      phone,
      passwordHash,
      codeHash: codeHash(code),
      expiresAt: codeExpiresAt(15)
    });
    await sendVerifyEmail(email, code);

    res.status(201).json({
      message: 'Код подтверждения отправлен на email',
      requiresEmailVerification: true,
      email
    });
  } catch (error) {
    console.error(error);
    if (sendMailErrorResponse(res, error)) return;
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const verifyEmail = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, code } = req.body;
  try {
    const hashedCode = codeHash(String(code || '').toUpperCase());
    const pending = await User.verifyPendingByCode(email, hashedCode);
    let user = null;

    if (pending && !pending.expired) {
      const exists = await User.findByEmail(email);
      if (exists) {
        await User.deletePendingByEmail(email);
        user = exists;
      } else {
        const userId = await User.create({
          name: pending.name,
          email: pending.email,
          phone: pending.phone,
          passwordHash: pending.passwordHash
        });
        await User.markEmailVerifiedById(userId);
        await User.deletePendingByEmail(email);
        user = await User.findById(userId);
      }
    } else if (pending && pending.expired) {
      return res.status(400).json({ message: '\u0421\u0440\u043e\u043a \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043a\u043e\u0434\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0438\u0441\u0442\u0435\u043a' });
    } else {
      const legacy = await User.verifyEmailByCode(email, hashedCode);
      if (!legacy) return res.status(400).json({ message: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f' });
      if (legacy.expired) return res.status(400).json({ message: '\u0421\u0440\u043e\u043a \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043a\u043e\u0434\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0438\u0441\u0442\u0435\u043a' });
      user = await User.findById(legacy.id);
    }

    if (!user) return res.status(400).json({ message: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f' });
    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error(error);
    if (sendMailErrorResponse(res, error)) return;
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 email \u0438\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c' });

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return res.status(401).json({ message: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 email \u0438\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c' });

    if (!user.emailVerified) {
      const code = makeCode();
      await User.setEmailVerificationCode(email, codeHash(code), codeExpiresAt(15));
      await sendVerifyEmail(email, code);
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d. \u041d\u043e\u0432\u044b\u0439 \u043a\u043e\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d.',
        requiresEmailVerification: true,
        email
      });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error(error);
    if (sendMailErrorResponse(res, error)) return;
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    if (sendMailErrorResponse(res, error)) return;
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const user = await User.findByEmail(email);
    if (user) {
      const code = makeCode();
      await User.setResetCode(email, codeHash(code), codeExpiresAt(15));
      await sendResetEmail(email, code);
    }
    res.json({ message: 'Если такой email существует, код восстановления отправлен.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const resendVerificationCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const code = makeCode();
    const pending = await User.findPendingByEmail(email);
    if (pending) {
      await User.updatePendingVerificationCode(email, codeHash(code), codeExpiresAt(15));
      await sendVerifyEmail(email, code);
      return res.json({ message: 'Код подтверждения отправлен повторно' });
    }

    const user = await User.findByEmail(email);
    if (user && !user.emailVerified) {
      await User.setEmailVerificationCode(email, codeHash(code), codeExpiresAt(15));
      await sendVerifyEmail(email, code);
      return res.json({ message: 'Код подтверждения отправлен повторно' });
    }

    return res.status(400).json({ message: 'Email не найден или уже подтвержден' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, code, password, passwordConfirm } = req.body;

  try {
    if (!/\p{L}/u.test(String(password || ''))) {
      return res.status(400).json({ message: 'Пароль должен содержать хотя бы одну букву' });
    }
    if (String(password || '').length < 6) {
      return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' });
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const result = await User.resetPasswordByCode(email, codeHash(String(code || '').toUpperCase()), passwordHash);

    if (!result) return res.status(400).json({ message: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f?' });
    if (result.expired) return res.status(400).json({ message: '\u0421\u0440\u043e\u043a \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043a\u043e\u0434\u0430 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f \u0438\u0441\u0442\u0435\u043a' });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  getMe,
  forgotPassword,
  resetPassword
};
