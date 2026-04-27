CREATE DATABASE IF NOT EXISTS barber_shop_db;
USE barber_shop_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  avatarUrl MEDIUMTEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  durationMin INT DEFAULT 60,
  imageUrl MEDIUMTEXT,
  category VARCHAR(100),
  isPopular BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  specialty VARCHAR(120),
  experienceYears INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 5.00,
  bio TEXT,
  imageUrl MEDIUMTEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barber_services (
  barberId INT NOT NULL,
  serviceId INT NOT NULL,
  PRIMARY KEY (barberId, serviceId),
  FOREIGN KEY (barberId) REFERENCES barbers(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  barberId INT NOT NULL,
  serviceId INT NOT NULL,
  appointmentAt DATETIME NOT NULL,
  comment TEXT,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (barberId) REFERENCES barbers(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  serviceId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_service_fav (userId, serviceId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recordId INT NULL,
  userId INT NULL,
  serviceId INT NULL,
  barberId INT NOT NULL,
  authorName VARCHAR(120) NOT NULL,
  rating INT NULL,
  text TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_review_record (recordId),
  FOREIGN KEY (recordId) REFERENCES records(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (barberId) REFERENCES barbers(id) ON DELETE CASCADE
);

INSERT INTO services (title, description, price, category, isPopular)
SELECT 'Классическая стрижка', 'Аккуратная форма и стиль под ваш образ.', 40.00, 'Стрижки', TRUE
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Классическая стрижка');

INSERT INTO services (title, description, price, category, isPopular)
SELECT 'Бритье опасной бритвой', 'Традиционное бритье с горячим полотенцем.', 35.00, 'Бритье', TRUE
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Бритье опасной бритвой');

INSERT INTO services (title, description, price, category, isPopular)
SELECT 'Комплекс стрижка + борода', 'Полный мужской grooming за один визит.', 65.00, 'Комплексы', TRUE
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Комплекс стрижка + борода');

INSERT INTO barbers (name, specialty, experienceYears, rating, bio)
SELECT 'Артем Соколов', 'Fade / Textured Crop', 7, 4.9, 'Специалист по современным мужским стрижкам.'
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE name = 'Артем Соколов');

INSERT INTO barbers (name, specialty, experienceYears, rating, bio)
SELECT 'Максим Руденко', 'Classic / Beard', 10, 4.8, 'Классика барбершопа и работа с бородой.'
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE name = 'Максим Руденко');

INSERT IGNORE INTO barber_services (barberId, serviceId)
SELECT b.id, s.id
FROM barbers b
JOIN services s ON s.title IN ('Классическая стрижка', 'Комплекс стрижка + борода')
WHERE b.name = 'Артем Соколов';

INSERT IGNORE INTO barber_services (barberId, serviceId)
SELECT b.id, s.id
FROM barbers b
JOIN services s ON s.title IN ('Бритье опасной бритвой', 'Комплекс стрижка + борода')
WHERE b.name = 'Максим Руденко';

INSERT INTO reviews (barberId, authorName, rating, text)
SELECT b.id, 'Илья', 5, 'Отличная работа и точное попадание в образ.'
FROM barbers b
WHERE b.name = 'Артем Соколов'
  AND NOT EXISTS (
    SELECT 1 FROM reviews r WHERE r.barberId = b.id AND r.authorName = 'Илья'
  );

INSERT INTO reviews (barberId, authorName, rating, text)
SELECT b.id, 'Сергей', 5, 'Профессионально, быстро и очень аккуратно.'
FROM barbers b
WHERE b.name = 'Максим Руденко'
  AND NOT EXISTS (
    SELECT 1 FROM reviews r WHERE r.barberId = b.id AND r.authorName = 'Сергей'
  );
