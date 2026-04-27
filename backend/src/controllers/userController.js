const { validationResult } = require('express-validator');
const User = require('../models/UserModel');

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMe = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updated = await User.updateProfile(req.userId, req.body);
    if (!updated) return res.status(400).json({ message: 'Failed to update profile' });
    const user = await User.findById(req.userId);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const listUsers = async (_req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Invalid user id' });
    if (req.userId === userId) {
      return res.status(400).json({ message: 'Нельзя удалить текущего администратора' });
    }

    const deleted = await User.deleteById(userId);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMe,
  updateMe,
  listUsers,
  deleteUser
};
