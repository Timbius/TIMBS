const pool = require('../config/db');

class User {
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, avatarUrl, role, createdAt FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create({ name, email, passwordHash }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, passwordHash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    return result.insertId;
  }

  static async updateProfile(id, { name, email, avatarUrl }) {
    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, avatarUrl = ? WHERE id = ?',
      [name, email, avatarUrl || null, id]
    );
    return result.affectedRows > 0;
  }

  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, email, avatarUrl, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 200'
    );
    return rows;
  }

  static async deleteById(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = User;
