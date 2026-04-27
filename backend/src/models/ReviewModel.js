const pool = require('../config/db');

class Review {
  static async create({ recordId, userId, serviceId, barberId, authorName, rating, text }) {
    const [result] = await pool.query(
      `INSERT INTO reviews (recordId, userId, serviceId, barberId, authorName, rating, text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recordId, userId, serviceId, barberId, authorName, rating ?? null, text ?? null]
    );
    return result.insertId;
  }

  static async findByRecord(recordId) {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE recordId = ?', [recordId]);
    return rows[0];
  }

  static async canUserReviewRecord(userId, recordId) {
    const [rows] = await pool.query(
      `SELECT r.id, r.userId, r.status, r.barberId, r.serviceId, u.name AS userName
       FROM records r
       INNER JOIN users u ON u.id = r.userId
       WHERE r.id = ? AND r.userId = ? AND r.status = 'completed'`,
      [recordId, userId]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows[0];
  }

  static async listByUser(userId) {
    const [rows] = await pool.query(
      `SELECT rv.id, rv.recordId, rv.rating, rv.text, rv.createdAt,
              b.id AS barberId, b.name AS barberName,
              s.id AS serviceId, s.title AS serviceTitle
       FROM reviews rv
       LEFT JOIN barbers b ON b.id = rv.barberId
       LEFT JOIN services s ON s.id = rv.serviceId
       WHERE rv.userId = ?
       ORDER BY rv.createdAt DESC`,
      [userId]
    );
    return rows;
  }

  static async updateByOwner(id, userId, { rating, text }) {
    const [result] = await pool.query(
      `UPDATE reviews
       SET rating = ?, text = ?
       WHERE id = ? AND userId = ?`,
      [rating ?? null, text ?? null, id, userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteByOwner(id, userId) {
    const [result] = await pool.query('DELETE FROM reviews WHERE id = ? AND userId = ?', [id, userId]);
    return result.affectedRows > 0;
  }

  static async recalcBarberRating(barberId) {
    const [rows] = await pool.query(
      `SELECT AVG(rating) AS avgRating
       FROM reviews
       WHERE barberId = ? AND rating IS NOT NULL`,
      [barberId]
    );
    const avg = rows[0]?.avgRating;
    const value = avg === null || avg === undefined ? 5 : Number(avg);
    await pool.query('UPDATE barbers SET rating = ? WHERE id = ?', [value, barberId]);
    return value;
  }
}

module.exports = Review;
