const pool = require('../config/db');

class Service {
  static async findAll(filters = {}) {
    let sql = 'SELECT s.* FROM services s';
    let countSql = 'SELECT COUNT(*) AS total FROM services s';
    const values = [];
    const conditions = [];

    if (filters.category) {
      conditions.push('s.category = ?');
      values.push(filters.category);
    }

    if (filters.search) {
      conditions.push('(s.title LIKE ? OR s.description LIKE ? OR s.category LIKE ?)');
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.popular === 'true') {
      conditions.push('s.isPopular = TRUE');
    }

    if (filters.minPrice !== undefined && filters.minPrice !== '') {
      conditions.push('s.price >= ?');
      values.push(Number(filters.minPrice));
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
      conditions.push('s.price <= ?');
      values.push(Number(filters.maxPrice));
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      sql += where;
      countSql += where;
    }

    const sortMap = {
      price_asc: 's.price ASC',
      price_desc: 's.price DESC',
      title_asc: 's.title ASC',
      title_desc: 's.title DESC',
      newest: 's.createdAt DESC'
    };

    sql += ` ORDER BY ${sortMap[filters.sort] || 's.createdAt DESC'}`;

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    const dataValues = [...values, limit, offset];

    const [rows] = await pool.query(sql, dataValues);
    const [countRows] = await pool.query(countSql, values);
    return {
      items: rows,
      page,
      limit,
      total: countRows[0]?.total || 0
    };
  }

  static async findPopular(limit = 3) {
    const [rows] = await pool.query(
      'SELECT * FROM services WHERE isPopular = TRUE ORDER BY createdAt DESC LIMIT ?',
      [limit]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(serviceData) {
    const { title, description, price, durationMin, imageUrl, category, isPopular } = serviceData;
    const [result] = await pool.query(
      'INSERT INTO services (title, description, price, durationMin, imageUrl, category, isPopular) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        description || null,
        price,
        Number(durationMin) || 60,
        imageUrl || null,
        category || null,
        Boolean(isPopular)
      ]
    );
    return result.insertId;
  }

  static async update(id, serviceData) {
    const { title, description, price, durationMin, imageUrl, category, isPopular } = serviceData;
    const [result] = await pool.query(
      `UPDATE services
       SET title = ?, description = ?, price = ?, durationMin = ?, imageUrl = ?, category = ?, isPopular = ?
       WHERE id = ?`,
      [
        title,
        description || null,
        price,
        Number(durationMin) || 60,
        imageUrl || null,
        category || null,
        Boolean(isPopular),
        id
      ]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM services WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async search(query) {
    const q = `%${query}%`;
    const [rows] = await pool.query(
      `SELECT id, title, description, category, price, isPopular
       FROM services
       WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
       ORDER BY isPopular DESC, createdAt DESC
       LIMIT 20`,
      [q, q, q]
    );
    return rows;
  }

  static async linkToBarbers(serviceId, barberIds = []) {
    await pool.query('DELETE FROM barber_services WHERE serviceId = ?', [serviceId]);
    if (!barberIds.length) return;

    const values = barberIds.map((barberId) => [Number(barberId), Number(serviceId)]);
    await pool.query('INSERT INTO barber_services (barberId, serviceId) VALUES ?', [values]);
  }

  static async findBarbers(serviceId) {
    const [rows] = await pool.query(
      `SELECT b.id, b.name, b.specialty, b.experienceYears, b.rating, b.imageUrl
       FROM barbers b
       INNER JOIN barber_services bs ON bs.barberId = b.id
       WHERE bs.serviceId = ?
       ORDER BY b.rating DESC, b.experienceYears DESC`,
      [serviceId]
    );
    return rows;
  }
}

module.exports = Service;
