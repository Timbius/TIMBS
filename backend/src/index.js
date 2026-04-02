require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// Импортируем маршруты
const authRoutes = require('./routes/authRoutes');

// Подключаем маршруты
app.use('/api/auth', authRoutes);

// Тестовый маршрут для проверки работы сервера
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});