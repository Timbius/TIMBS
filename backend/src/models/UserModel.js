const pool = require('../config/db');

const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image/');
const mapUserImage = (row) => {
  if (!row) return row;
  const normalized = { ...row };
  normalized.avatarUrl = normalized.avatarData || normalized.avatarUrl || null;
  delete normalized.avatarData;
  return normalized;
};

class User {
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findByPhone(phone) {
    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, emailVerified, avatarUrl, avatarData, role, createdAt FROM users WHERE id = ?',
      [id]
    );
    return mapUserImage(rows[0]);
  }

  static async create({ name, email, phone, passwordHash }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, passwordHash) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, passwordHash]
    );
    return result.insertId;
  }

  static async findPendingByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM pending_registrations WHERE email = ?', [email]);
    return rows[0];
  }

  static async findPendingByPhone(phone) {
    const [rows] = await pool.query('SELECT * FROM pending_registrations WHERE phone = ?', [phone]);
    return rows[0];
  }

  static async upsertPendingRegistration({ name, email, phone, passwordHash, codeHash, expiresAt }) {
    const [result] = await pool.query(
      `INSERT INTO pending_registrations (name, email, phone, passwordHash, verifyCodeHash, verifyCodeExpires)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         passwordHash = VALUES(passwordHash),
         verifyCodeHash = VALUES(verifyCodeHash),
         verifyCodeExpires = VALUES(verifyCodeExpires)`,
      [name, email, phone || null, passwordHash, codeHash, expiresAt]
    );
    return result.affectedRows > 0;
  }

  static async verifyPendingByCode(email, codeHashValue) {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, passwordHash, verifyCodeExpires
       FROM pending_registrations
       WHERE email = ? AND verifyCodeHash = ?`,
      [email, codeHashValue]
    );
    const row = rows[0];
    if (!row) return null;
    if (!row.verifyCodeExpires || new Date(row.verifyCodeExpires).getTime() < Date.now()) {
      return { expired: true };
    }
    return row;
  }

  static async updatePendingVerificationCode(email, codeHashValue, expiresAt) {
    const [result] = await pool.query(
      `UPDATE pending_registrations
       SET verifyCodeHash = ?, verifyCodeExpires = ?
       WHERE email = ?`,
      [codeHashValue, expiresAt, email]
    );
    return result.affectedRows > 0;
  }

  static async deletePendingByEmail(email) {
    const [result] = await pool.query('DELETE FROM pending_registrations WHERE email = ?', [email]);
    return result.affectedRows > 0;
  }

  static async markEmailVerifiedById(id) {
    const [result] = await pool.query(
      'UPDATE users SET emailVerified = TRUE, emailVerifyCodeHash = NULL, emailVerifyCodeExpires = NULL WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async updateProfile(id, { name, email, phone, avatarUrl }) {
    const avatarData = isDataImage(avatarUrl) ? avatarUrl : null;
    const avatarLink = avatarData ? null : avatarUrl || null;
    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, avatarUrl = ?, avatarData = ? WHERE id = ?',
      [name, email, phone || null, avatarLink, avatarData, id]
    );
    return result.affectedRows > 0;
  }

  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, emailVerified, avatarUrl, avatarData, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 200'
    );
    return rows.map(mapUserImage);
  }

  static async setEmailVerificationCode(email, codeHash, expiresAt) {
    const [result] = await pool.query(
      `UPDATE users
       SET emailVerifyCodeHash = ?, emailVerifyCodeExpires = ?, emailVerified = FALSE
       WHERE email = ?`,
      [codeHash, expiresAt, email]
    );
    return result.affectedRows > 0;
  }

  static async verifyEmailByCode(email, codeHash) {
    const [rows] = await pool.query(
      `SELECT id, emailVerifyCodeExpires
       FROM users
       WHERE email = ? AND emailVerifyCodeHash = ? AND emailVerified = FALSE`,
      [email, codeHash]
    );
    const user = rows[0];
    if (!user) return null;
    if (!user.emailVerifyCodeExpires || new Date(user.emailVerifyCodeExpires).getTime() < Date.now()) {
      return { expired: true };
    }

    await pool.query(
      `UPDATE users
       SET emailVerified = TRUE, emailVerifyCodeHash = NULL, emailVerifyCodeExpires = NULL
       WHERE id = ?`,
      [user.id]
    );
    return { id: user.id };
  }

  static async setResetCode(email, codeHash, expiresAt) {
    const [result] = await pool.query(
      `UPDATE users
       SET resetCodeHash = ?, resetCodeExpires = ?
       WHERE email = ?`,
      [codeHash, expiresAt, email]
    );
    return result.affectedRows > 0;
  }

  static async resetPasswordByCode(email, codeHash, passwordHash) {
    const [rows] = await pool.query(
      `SELECT id, resetCodeExpires
       FROM users
       WHERE email = ? AND resetCodeHash = ?`,
      [email, codeHash]
    );
    const user = rows[0];
    if (!user) return null;
    if (!user.resetCodeExpires || new Date(user.resetCodeExpires).getTime() < Date.now()) {
      return { expired: true };
    }
    await pool.query(
      `UPDATE users
       SET passwordHash = ?, resetCodeHash = NULL, resetCodeExpires = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );
    return { id: user.id };
  }

  static async deleteById(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = User;
