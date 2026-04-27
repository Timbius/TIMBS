const pool = require('../config/db');

class Favorite {
  static async isFavorited(userId, serviceId) {
    const [rows] = await pool.query('SELECT id FROM favorites WHERE userId = ? AND serviceId = ?', [
      userId,
      serviceId
    ]);
    return Boolean(rows[0]);
  }

  static async toggle(userId, serviceId) {
    const favorited = await this.isFavorited(userId, serviceId);
    if (favorited) {
      await pool.query('DELETE FROM favorites WHERE userId = ? AND serviceId = ?', [userId, serviceId]);
      return { favorited: false };
    }

    await pool.query('INSERT INTO favorites (userId, serviceId) VALUES (?, ?)', [userId, serviceId]);
    return { favorited: true };
  }

  static async listByUser(userId) {
    const [rows] = await pool.query(
      `SELECT s.*
       FROM favorites f
       INNER JOIN services s ON s.id = f.serviceId
       WHERE f.userId = ?
       ORDER BY f.createdAt DESC`,
      [userId]
    );
    return rows;
  }

  static async listServiceIdsByUser(userId) {
    const [rows] = await pool.query('SELECT serviceId FROM favorites WHERE userId = ?', [userId]);
    return rows.map((row) => row.serviceId);
  }
}

module.exports = Favorite;
