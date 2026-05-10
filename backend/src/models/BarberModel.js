const pool = require('../config/db');

const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image/');
const mapBarberImage = (row) => {
  if (!row) return row;
  const normalized = { ...row };
  normalized.imageUrl = normalized.imageData || normalized.imageUrl || null;
  delete normalized.imageData;
  return normalized;
};

class Barber {
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM barbers';
    const values = [];
    const conditions = [];

    if (filters.search) {
      conditions.push('(name LIKE ? OR specialty LIKE ? OR bio LIKE ?)');
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.specialty) {
      conditions.push('specialty = ?');
      values.push(filters.specialty);
    }

    if (filters.minRating) {
      conditions.push('rating >= ?');
      values.push(Number(filters.minRating));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (filters.top === 'true') {
      sql += ' ORDER BY rating DESC, experienceYears DESC LIMIT 6';
    } else {
      const sortMap = {
        rating_desc: 'rating DESC',
        experience_desc: 'experienceYears DESC',
        name_asc: 'name ASC',
        newest: 'createdAt DESC'
      };
      sql += ` ORDER BY ${sortMap[filters.sort] || 'rating DESC, createdAt DESC'}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(mapBarberImage);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM barbers WHERE id = ?', [id]);
    return mapBarberImage(rows[0]);
  }

  static async findServices(barberId) {
    const [rows] = await pool.query(
      `SELECT s.*
       FROM services s
       INNER JOIN barber_services bs ON bs.serviceId = s.id
       WHERE bs.barberId = ?
       ORDER BY s.title ASC`,
      [barberId]
    );
    return rows.map((row) => ({
      ...row,
      imageUrl: row.imageData || row.imageUrl || null,
      imageData: undefined
    }));
  }

  static async findReviews(barberId) {
    const [rows] = await pool.query(
      `SELECT id, barberId, authorName, rating, text, createdAt
       FROM reviews
       WHERE barberId = ?
       ORDER BY createdAt DESC`,
      [barberId]
    );
    return rows;
  }

  static async create(data) {
    const { name, specialty, experienceYears, rating, bio, imageUrl } = data;
    const imageData = isDataImage(imageUrl) ? imageUrl : null;
    const imageLink = imageData ? null : imageUrl || null;
    const [result] = await pool.query(
      `INSERT INTO barbers (name, specialty, experienceYears, rating, bio, imageUrl, imageData)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, specialty || null, Number(experienceYears) || 0, Number(rating) || 5, bio || null, imageLink, imageData]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, specialty, experienceYears, rating, bio, imageUrl } = data;
    const imageData = isDataImage(imageUrl) ? imageUrl : null;
    const imageLink = imageData ? null : imageUrl || null;
    const [result] = await pool.query(
      `UPDATE barbers
       SET name = ?, specialty = ?, experienceYears = ?, rating = ?, bio = ?, imageUrl = ?, imageData = ?
       WHERE id = ?`,
      [name, specialty || null, Number(experienceYears) || 0, Number(rating) || 5, bio || null, imageLink, imageData, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM barbers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Barber;
