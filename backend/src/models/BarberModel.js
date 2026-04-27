const pool = require('../config/db');

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
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM barbers WHERE id = ?', [id]);
    return rows[0];
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
    return rows;
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
    const [result] = await pool.query(
      `INSERT INTO barbers (name, specialty, experienceYears, rating, bio, imageUrl)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, specialty || null, Number(experienceYears) || 0, Number(rating) || 5, bio || null, imageUrl || null]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, specialty, experienceYears, rating, bio, imageUrl } = data;
    const [result] = await pool.query(
      `UPDATE barbers
       SET name = ?, specialty = ?, experienceYears = ?, rating = ?, bio = ?, imageUrl = ?
       WHERE id = ?`,
      [name, specialty || null, Number(experienceYears) || 0, Number(rating) || 5, bio || null, imageUrl || null, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM barbers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Barber;
