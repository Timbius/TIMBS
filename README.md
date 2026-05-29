# Barber Factory

Веб-приложение для онлайн-записи в барбершоп: каталог услуг, мастера, избранное, личный кабинет, записи, отзывы и админ-панель.

## Что есть в проекте

- Главная страница с популярными услугами и мастерами.
- Каталог услуг с фильтрами, сортировкой, пагинацией и фотографиями услуг.
- Страницы услуги и мастера.
- Регистрация, подтверждение email, вход и восстановление пароля.
- Личный кабинет пользователя: профиль, избранные услуги, записи и отзывы.
- Онлайн-запись с выбором услуги, мастера, даты и свободного времени.
- Админ-панель для управления услугами, мастерами, пользователями и записями.

## Технологии

- Frontend: HTML, CSS, Vanilla JavaScript.
- Backend: Node.js, Express.
- Database: MySQL.
- Auth: JWT.
- Email: Nodemailer.

## Где скачать

С GitHub:

```bash
git clone https://github.com/Timbius/TIMBS.git
cd TIMBS
```

Если Git не установлен, откройте страницу репозитория `https://github.com/Timbius/TIMBS`, нажмите `Code`, затем `Download ZIP`, распакуйте архив и откройте папку проекта в терминале.

## Требования

- Node.js 18 или новее.
- npm.
- MySQL Server.
- Доступ к SMTP-почте, если нужно отправлять коды подтверждения и восстановления пароля.

## Настройка базы данных

1. Создайте базу данных MySQL:

```sql
CREATE DATABASE IF NOT EXISTS barber_shop_db;
```

2. Схема находится в файле `db_schema.sql`. Сервер также запускает инициализацию схемы при старте через `backend/src/config/initSchema.js`.

## Настройка переменных окружения

Создайте файл `backend/.env`:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=barber_shop_db

JWT_SECRET=replace_with_long_secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM=Barber Factory <your_email@example.com>
```

Названия SMTP-переменных должны соответствовать `backend/src/utils/mailer.js`. Для регистрации, подтверждения email и восстановления пароля нужны рабочие SMTP-данные, иначе backend вернет ошибку настройки email.

## Установка

Установите зависимости корня проекта:

```bash
npm install
```

Установите зависимости backend:

```bash
npm --prefix backend install
```

## Запуск

Основной запуск из корня проекта:

```bash
npm run dev
```

После запуска приложение доступно по адресу:

```text
http://localhost:3000
```

Проверка API:

```text
http://localhost:3000/api/health
```

Backend отдает и API, и статический frontend из `frontend/public`, поэтому отдельный dev-сервер для frontend не требуется.

## Полезные команды

```bash
npm run dev
npm start
npm --prefix backend run start
npm --prefix backend run dev
```

## Основные маршруты frontend

- `/` - главная.
- `/catalog` - каталог услуг.
- `/catalog/:id` - страница услуги.
- `/barbers` - мастера.
- `/barbers/:id` - страница мастера.
- `/search` - поиск.
- `/records` - онлайн-запись, доступна авторизованным пользователям.
- `/profile` - профиль, доступен авторизованным пользователям.
- `/admin` - админ-панель, доступна только администратору.
- `/auth/login` и `/auth/register` - гостевые маршруты, для авторизованного пользователя перенаправляют в профиль.

## Основные API

### Auth

- `POST /api/auth/register` - регистрация, отправляет код подтверждения.
- `POST /api/auth/verify-email` - подтверждение email.
- `POST /api/auth/resend-verification-code` - повторная отправка кода.
- `POST /api/auth/login` - вход.
- `POST /api/auth/forgot-password` - отправка кода восстановления.
- `POST /api/auth/reset-password` - смена пароля по коду.
- `GET /api/auth/me` - текущий пользователь.

Пример регистрации:

```json
{
  "name": "Иван",
  "email": "ivan@example.com",
  "phone": "+375291234567",
  "password": "secret1",
  "passwordConfirm": "secret1"
}
```

### Services

- `GET /api/services` - каталог услуг.
- `GET /api/services/popular` - популярные услуги.
- `GET /api/services/:id` - услуга по id.
- `POST /api/services` - создать услугу, только admin.
- `PUT /api/services/:id` - обновить услугу, только admin.
- `DELETE /api/services/:id` - удалить услугу, только admin.

Поддерживаемые query-параметры каталога: `search`, `category`, `sort`, `minPrice`, `maxPrice`, `popular`, `page`, `limit`.

### Records

- `GET /api/records/schedule?barber=:id&date=YYYY-MM-DD` - занятые слоты мастера.
- `POST /api/records` - создать запись.
- `GET /api/records/my` - мои записи.
- `DELETE /api/records/:id` - отменить свою запись.
- `PATCH /api/records/:id/complete` - отметить посещение.
- `GET /api/records` - все записи, только admin.
- `PUT /api/records/:id` - обновить запись, только admin.
- `DELETE /api/records/:id/admin` - удалить запись, только admin.

Пример создания записи:

```json
{
  "serviceId": 1,
  "barberId": 2,
  "appointmentAt": "2026-07-01T14:00:00",
  "comment": "Пожелания к записи"
}
```

### Favorites, Users, Reviews

- `GET /api/favorites/my` - избранные услуги текущего пользователя.
- `GET /api/favorites/my/ids` - id избранных услуг.
- `POST /api/favorites/services/:serviceId/toggle` - добавить или убрать услугу из избранного.
- `GET /api/users/me` - профиль.
- `PUT /api/users/me` - обновить профиль.
- `GET /api/users` - список пользователей, только admin.
- `DELETE /api/users/:id` - удалить пользователя, только admin.
- `GET /api/reviews/my` - мои отзывы.
- `POST /api/reviews` - создать отзыв.
- `PUT /api/reviews/:id` - обновить отзыв.
- `DELETE /api/reviews/:id` - удалить отзыв.

## Что нужно было исправить в README на GitHub

- Добавить инструкции скачивания проекта через `git clone` и `Download ZIP`.
- Добавить требования к Node.js, npm и MySQL.
- Добавить пример `backend/.env`.
- Описать фактический запуск: `npm install`, `npm --prefix backend install`, `npm run dev`, адрес `http://localhost:3000`.
- Исправить endpoint свободных слотов на `GET /api/records/schedule`.
- Обновить пример регистрации: теперь нужны `phone` и `passwordConfirm`, а email подтверждается кодом.
- Добавить актуальные маршруты избранного, отзывов, профиля и админ-панели.
- Уточнить, что frontend отдается backend-сервером из `frontend/public`.
