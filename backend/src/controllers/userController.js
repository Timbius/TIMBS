const { validationResult } = require('express-validator');
const User = require('../models/UserModel');
const Record = require('../models/RecordModel');

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const getMyRecordsViaUsers = async (req, res) => {
  try {
    const records = await Record.findByUser(req.userId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
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
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const listUsers = async (_req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ message: '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 ID \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f' });
    if (req.userId === userId) {
      return res.status(400).json({ message: 'Cannot delete current administrator' });
    }

    const deleted = await User.deleteById(userId);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430' });
  }
};

module.exports = {
  getMe,
  getMyRecordsViaUsers,
  updateMe,
  listUsers,
  deleteUser
};
