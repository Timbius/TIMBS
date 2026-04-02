const pool = require('../config/db');

class Service {
  // Получить все услуги с фильтрацией
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM services';
    const values = [];
    const conditions = [];

    if (filters.category) {
      conditions.push('category = ?');
      values.push(filters.category);
    }

    if (filters.popular === 'true') {
      conditions.push('isPopular = TRUE');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (filters.sort === 'price_asc') {
      sql += ' ORDER BY price ASC';
    } else if (filters.sort === 'price_desc') {
      sql += ' ORDER BY price DESC';
    }

    const [rows] = await pool.query(sql, values);
    return rows;
  }

  // Получить одну услугу по ID
  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);
    return rows[0];
  }

  // Создать услугу
  static async create(serviceData) {
    const { title, description, price, imageUrl, category, isPopular } = serviceData;
    const [result] = await pool.query(
      'INSERT INTO services (title, description, price, imageUrl, category, isPopular) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, price, imageUrl || null, category || null, isPopular || false]
    );
    return result.insertId;
  }

  // Обновить услугу
  static async update(id, serviceData) {
    const { title, description, price, imageUrl, category, isPopular } = serviceData;
    const [result] = await pool.query(
      `UPDATE services 
       SET title = ?, description = ?, price = ?, imageUrl = ?, category = ?, isPopular = ? 
       WHERE id = ?`,
      [title, description, price, imageUrl || null, category || null, isPopular || false, id]
    );
    return result.affectedRows > 0;
  }

  // Удалить услугу
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM services WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Service;