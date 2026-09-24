const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/stations - list all polling stations (with optional constituency/county filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { county_id, constituency_id, search } = req.query;

    let query = `
      SELECT ps.id, ps.station_code, ps.name, ps.latitude, ps.longitude,
             ps.registered_voters, c.name AS constituency, co.name AS county
      FROM polling_stations ps
      JOIN constituencies c ON ps.constituency_id = c.id
      JOIN counties co ON c.county_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (county_id) {
      params.push(county_id);
      query += ` AND co.id = $${params.length}`;
    }
    if (constituency_id) {
      params.push(constituency_id);
      query += ` AND c.id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ps.name ILIKE $${params.length} OR ps.station_code ILIKE $${params.length})`;
    }

    query += ' ORDER BY ps.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch polling stations' });
  }
});

// GET /api/stations/map - all stations with coordinates + live status summary,
// for plotting on the HQ dashboard map. Color coding is left to the frontend
// based on has_open_incident / latest_queue_length / has_report.
// IMPORTANT: this must be defined BEFORE the /:id route below, or Express
// will match "map" as if it were an :id value and this route never runs.
router.get('/map', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.id, ps.station_code, ps.name, ps.latitude, ps.longitude,
             c.name AS constituency, co.name AS county,
             latest.queue_length, latest.kiems_status, latest.submitted_at,
             COALESCE(inc.open_incidents, 0) AS open_incidents
      FROM polling_stations ps
      JOIN constituencies c ON ps.constituency_id = c.id
      JOIN counties co ON c.county_id = co.id
      LEFT JOIN LATERAL (
        SELECT queue_length, kiems_status, submitted_at
        FROM station_reports sr
        WHERE sr.polling_station_id = ps.id
        ORDER BY submitted_at DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN (
        SELECT polling_station_id, COUNT(*) AS open_incidents
        FROM incidents
        WHERE status != 'resolved'
        GROUP BY polling_station_id
      ) inc ON inc.polling_station_id = ps.id
      WHERE ps.latitude IS NOT NULL AND ps.longitude IS NOT NULL
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch station map data' });
  }
});

// GET /api/stations/:id - single station detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, c.name AS constituency, co.name AS county
       FROM polling_stations ps
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE ps.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Polling station not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch polling station' });
  }
});

// PATCH /api/stations/:id/schedule - HQ sets/updates the estimated open/close times
// shown to voters on the public lookup. Restricted to admin and county_coordinator.
router.patch('/:id/schedule', authenticate, authorize('admin', 'county_coordinator'), async (req, res) => {
  try {
    const { estimated_opening_time, estimated_closing_time } = req.body;

    if (!estimated_opening_time && !estimated_closing_time) {
      return res.status(400).json({ error: 'Provide at least one of estimated_opening_time or estimated_closing_time' });
    }

    const result = await pool.query(
      `UPDATE polling_stations
       SET estimated_opening_time = COALESCE($1, estimated_opening_time),
           estimated_closing_time = COALESCE($2, estimated_closing_time)
       WHERE id = $3
       RETURNING *`,
      [estimated_opening_time || null, estimated_closing_time || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Polling station not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update station schedule' });
  }
});

module.exports = router;
