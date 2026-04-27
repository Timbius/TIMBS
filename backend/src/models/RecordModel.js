const pool = require('../config/db');

class Record {
  static async create({ userId, barberId, serviceId, appointmentAt, comment }) {
    const [result] = await pool.query(
      `INSERT INTO records (userId, barberId, serviceId, appointmentAt, comment, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [userId, barberId, serviceId, appointmentAt, comment || null]
    );
    return result.insertId;
  }

  static async findByUser(userId) {
    const [rows] = await pool.query(
      `SELECT r.id, r.appointmentAt, r.comment, r.status, r.createdAt,
              s.id AS serviceId, s.title AS serviceTitle, s.price AS servicePrice, s.durationMin,
              b.id AS barberId, b.name AS barberName,
              rv.id AS reviewId
       FROM records r
       INNER JOIN services s ON s.id = r.serviceId
       INNER JOIN barbers b ON b.id = r.barberId
       LEFT JOIN reviews rv ON rv.recordId = r.id
       WHERE r.userId = ?
       ORDER BY r.appointmentAt DESC`,
      [userId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM records WHERE id = ?', [id]);
    return rows[0];
  }

  static async cancel(id, userId) {
    const [result] = await pool.query(
      `UPDATE records
       SET status = 'cancelled'
       WHERE id = ? AND userId = ? AND status = 'active'`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async complete(id, userId) {
    const [result] = await pool.query(
      `UPDATE records
       SET status = 'completed'
       WHERE id = ? AND userId = ? AND status = 'active'`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async findAll() {
    const [rows] = await pool.query(
      `SELECT r.id, r.appointmentAt, r.status, r.createdAt,
              u.id AS userId, u.name AS userName, u.email AS userEmail,
              s.id AS serviceId, s.title AS serviceTitle,
              b.id AS barberId, b.name AS barberName
       FROM records r
       INNER JOIN users u ON u.id = r.userId
       INNER JOIN services s ON s.id = r.serviceId
       INNER JOIN barbers b ON b.id = r.barberId
       ORDER BY r.createdAt DESC
       LIMIT 300`
    );
    return rows;
  }

  static async findSchedule(barberId, date) {
    const [rows] = await pool.query(
      `SELECT id, appointmentAt, status
       FROM records
       WHERE barberId = ? AND DATE(appointmentAt) = ? AND status = 'active'
       ORDER BY appointmentAt ASC`,
      [barberId, date]
    );
    return rows;
  }

  static async updateByAdmin(id, { userId, barberId, serviceId, appointmentAt, comment, status }) {
    const [result] = await pool.query(
      `UPDATE records
       SET userId = ?, barberId = ?, serviceId = ?, appointmentAt = ?, comment = ?, status = ?
       WHERE id = ?`,
      [userId, barberId, serviceId, appointmentAt, comment || null, status, id]
    );
    return result.affectedRows > 0;
  }

  static async deleteByAdmin(id) {
    const [result] = await pool.query('DELETE FROM records WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Record;
