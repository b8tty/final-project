const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { national_id, password } = req.body;
    if (!national_id || !password) {
      return res.status(400).json({ error: 'national_id and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE national_id = $1',
      [national_id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        polling_station_id: user.polling_station_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        polling_station_id: user.polling_station_id,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/register - restricted to admins, used to onboard field officers
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { full_name, national_id, phone_number, email, password, role, polling_station_id } = req.body;

    if (!full_name || !national_id || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, national_id, phone_number, email, password_hash, role, polling_station_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, role, polling_station_id`,
      [full_name, national_id, phone_number, email, password_hash, role, polling_station_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that national_id or email already exists' });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

module.exports = router;
