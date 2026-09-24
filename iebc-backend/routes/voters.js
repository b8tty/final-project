const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/voters/lookup?national_id=12345678
// Public endpoint (no auth) — a voter enters their National ID and gets
// back their assigned polling station plus its current live status:
// latest queue length, opening/closing times (both estimated by HQ and
// actual, once an officer has reported them).
router.get('/lookup', async (req, res) => {
  try {
    const { national_id } = req.query;

    if (!national_id) {
      return res.status(400).json({ error: 'national_id is required' });
    }

    const voterResult = await pool.query(
      `SELECT v.full_name, ps.id AS polling_station_id, ps.station_code, ps.name AS station_name,
              ps.latitude, ps.longitude,
              ps.estimated_opening_time, ps.estimated_closing_time,
              c.name AS constituency, co.name AS county
       FROM voters v
       JOIN polling_stations ps ON v.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE v.national_id = $1`,
      [national_id]
    );

    if (voterResult.rows.length === 0) {
      return res.status(404).json({ error: 'No voter record found for this National ID' });
    }

    const voter = voterResult.rows[0];

    // Pull the most recent status report for that station, if any exist yet
    const latestReport = await pool.query(
      `SELECT queue_length, kiems_status, materials_status, opening_time, closing_time, submitted_at
       FROM station_reports
       WHERE polling_station_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [voter.polling_station_id]
    );

    res.json({
      voter_name: voter.full_name,
      polling_station: {
        code: voter.station_code,
        name: voter.station_name,
        constituency: voter.constituency,
        county: voter.county,
        latitude: voter.latitude,
        longitude: voter.longitude,
        estimated_opening_time: voter.estimated_opening_time,
        estimated_closing_time: voter.estimated_closing_time,
      },
      live_status: latestReport.rows[0] || null, // null if no officer report has come in yet
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to look up polling station' });
  }
});

module.exports = router;
