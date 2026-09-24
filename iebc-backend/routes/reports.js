const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { getIO } = require('../socket');

const router = express.Router();

// POST /api/reports/station - submit a station status report
// Uses client_uuid (generated on device) to safely handle offline retries/duplicates
router.post('/station', authenticate, async (req, res) => {
  try {
    const {
      polling_station_id,
      queue_length,
      kiems_status,
      materials_status,
      opening_time,
      closing_time,
      notes,
      client_uuid,
      submitted_at,
    } = req.body;

    if (!polling_station_id || !client_uuid || !submitted_at) {
      return res.status(400).json({ error: 'polling_station_id, client_uuid, and submitted_at are required' });
    }

    const result = await pool.query(
      `INSERT INTO station_reports
        (polling_station_id, submitted_by, queue_length, kiems_status, materials_status,
         opening_time, closing_time, notes, client_uuid, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (client_uuid) DO NOTHING
       RETURNING *`,
      [polling_station_id, req.user.id, queue_length, kiems_status, materials_status,
       opening_time, closing_time, notes, client_uuid, submitted_at]
    );

    // If ON CONFLICT triggered, rows will be empty — this is a successful duplicate sync, not an error
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Report already synced', duplicate: true });
    }

    try { getIO().emit('station_report', result.rows[0]); } catch (_) { /* socket not ready */ }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit station report' });
  }
});

// POST /api/reports/incident - submit an incident report
router.post('/incident', authenticate, async (req, res) => {
  try {
    const { polling_station_id, category, description, client_uuid, occurred_at } = req.body;

    if (!polling_station_id || !category || !description || !client_uuid || !occurred_at) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO incidents (polling_station_id, reported_by, category, description, client_uuid, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (client_uuid) DO NOTHING
       RETURNING *`,
      [polling_station_id, req.user.id, category, description, client_uuid, occurred_at]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Incident already synced', duplicate: true });
    }

    try { getIO().emit('new_incident', result.rows[0]); } catch (_) { /* socket not ready */ }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit incident report' });
  }
});

// GET /api/reports/dashboard - aggregated summary for the dashboard
// Supports ?county_id= or ?constituency_id= filters
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { county_id, constituency_id } = req.query;
    const params = [];
    let filter = '';

    if (county_id) {
      params.push(county_id);
      filter = ` AND co.id = $${params.length}`;
    } else if (constituency_id) {
      params.push(constituency_id);
      filter = ` AND c.id = $${params.length}`;
    }

    const stationsReported = await pool.query(
      `SELECT COUNT(DISTINCT sr.polling_station_id) AS stations_reported
       FROM station_reports sr
       JOIN polling_stations ps ON sr.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE 1=1 ${filter}`,
      params
    );

    const incidentsByCategory = await pool.query(
      `SELECT i.category, COUNT(*) AS total
       FROM incidents i
       JOIN polling_stations ps ON i.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE 1=1 ${filter}
       GROUP BY i.category`,
      params
    );

    const openIncidents = await pool.query(
      `SELECT COUNT(*) AS open_incidents
       FROM incidents i
       JOIN polling_stations ps ON i.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE i.status = 'open' ${filter}`,
      params
    );

    const avgQueue = await pool.query(
      `SELECT AVG(sr.queue_length) AS avg_queue_length
       FROM station_reports sr
       JOIN polling_stations ps ON sr.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       WHERE 1=1 ${filter}`,
      params
    );

    res.json({
      stations_reported: parseInt(stationsReported.rows[0].stations_reported, 10),
      open_incidents: parseInt(openIncidents.rows[0].open_incidents, 10),
      avg_queue_length: parseFloat(avgQueue.rows[0].avg_queue_length) || 0,
      incidents_by_category: incidentsByCategory.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

// GET /api/reports/incidents - list incidents for HQ, with filters
// Supports ?status=open&county_id=&constituency_id=&polling_station_id=
router.get('/incidents', authenticate, async (req, res) => {
  try {
    const { status, county_id, constituency_id, polling_station_id } = req.query;
    const params = [];
    let filter = '';

    if (status) {
      params.push(status);
      filter += ` AND i.status = $${params.length}`;
    }
    if (polling_station_id) {
      params.push(polling_station_id);
      filter += ` AND ps.id = $${params.length}`;
    }
    if (constituency_id) {
      params.push(constituency_id);
      filter += ` AND c.id = $${params.length}`;
    }
    if (county_id) {
      params.push(county_id);
      filter += ` AND co.id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT i.id, i.category, i.description, i.status, i.occurred_at, i.synced_at, i.updated_at,
              ps.id AS polling_station_id, ps.name AS station_name, ps.station_code,
              c.name AS constituency, co.name AS county,
              u.full_name AS reported_by
       FROM incidents i
       JOIN polling_stations ps ON i.polling_station_id = ps.id
       JOIN constituencies c ON ps.constituency_id = c.id
       JOIN counties co ON c.county_id = co.id
       JOIN users u ON i.reported_by = u.id
       WHERE 1=1 ${filter}
       ORDER BY i.occurred_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// PATCH /api/reports/incidents/:id - HQ updates incident status (e.g. mark in_progress/resolved)
// Restricted to admin and county_coordinator.
router.patch('/incidents/:id', authenticate, authorize('admin', 'county_coordinator'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE incidents
       SET status = $1::report_status,
           updated_by = $2,
           updated_at = NOW(),
           resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    try { getIO().emit('incident_updated', result.rows[0]); } catch (_) { /* socket not ready */ }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// GET /api/reports/export - downloadable CSV of all incidents, for HQ's
// end-of-day report / academic writeup appendix.
router.get('/export', authenticate, authorize('admin', 'county_coordinator'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id, ps.station_code, ps.name AS station_name, c.name AS constituency,
             co.name AS county, i.category, i.description, i.status,
             u.full_name AS reported_by, i.occurred_at, i.resolved_at
      FROM incidents i
      JOIN polling_stations ps ON i.polling_station_id = ps.id
      JOIN constituencies c ON ps.constituency_id = c.id
      JOIN counties co ON c.county_id = co.id
      JOIN users u ON i.reported_by = u.id
      ORDER BY i.occurred_at DESC
    `);

    const headers = ['ID', 'Station Code', 'Station', 'Constituency', 'County', 'Category', 'Description', 'Status', 'Reported By', 'Occurred At', 'Resolved At'];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = result.rows.map((r) => [
      r.id, r.station_code, r.station_name, r.constituency, r.county,
      r.category, r.description, r.status, r.reported_by, r.occurred_at, r.resolved_at,
    ].map(escapeCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="iebc_incidents_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

// GET /api/reports/trends - incidents and station reports grouped by hour,
// for a time-series view of how election day is unfolding.
router.get('/trends', authenticate, async (req, res) => {
  try {
    const incidentsByHour = await pool.query(`
      SELECT date_trunc('hour', occurred_at) AS hour, COUNT(*) AS incidents
      FROM incidents
      GROUP BY hour
      ORDER BY hour
    `);

    const reportsByHour = await pool.query(`
      SELECT date_trunc('hour', submitted_at) AS hour, COUNT(*) AS reports
      FROM station_reports
      GROUP BY hour
      ORDER BY hour
    `);

    // Merge both series into one timeline, keyed by hour
    const merged = {};
    incidentsByHour.rows.forEach((r) => {
      const key = r.hour.toISOString();
      merged[key] = { hour: key, incidents: parseInt(r.incidents, 10), reports: 0 };
    });
    reportsByHour.rows.forEach((r) => {
      const key = r.hour.toISOString();
      if (!merged[key]) merged[key] = { hour: key, incidents: 0, reports: 0 };
      merged[key].reports = parseInt(r.reports, 10);
    });

    const timeline = Object.values(merged).sort((a, b) => new Date(a.hour) - new Date(b.hour));
    res.json(timeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load trend data' });
  }
});

// GET /api/reports/by-county - side-by-side comparison across counties
router.get('/by-county', authenticate, async (req, res) => {
  try {
    const reportStats = await pool.query(`
      SELECT co.name AS county,
             COUNT(DISTINCT sr.polling_station_id) AS stations_reported,
             ROUND(AVG(sr.queue_length)::numeric, 1) AS avg_queue_length
      FROM station_reports sr
      JOIN polling_stations ps ON sr.polling_station_id = ps.id
      JOIN constituencies c ON ps.constituency_id = c.id
      JOIN counties co ON c.county_id = co.id
      GROUP BY co.name
    `);

    const incidentStats = await pool.query(`
      SELECT co.name AS county,
             COUNT(*) AS total_incidents,
             COUNT(*) FILTER (WHERE i.status != 'resolved') AS open_incidents
      FROM incidents i
      JOIN polling_stations ps ON i.polling_station_id = ps.id
      JOIN constituencies c ON ps.constituency_id = c.id
      JOIN counties co ON c.county_id = co.id
      GROUP BY co.name
    `);

    const merged = {};
    reportStats.rows.forEach((r) => {
      merged[r.county] = {
        county: r.county,
        stations_reported: parseInt(r.stations_reported, 10),
        avg_queue_length: parseFloat(r.avg_queue_length) || 0,
        total_incidents: 0,
        open_incidents: 0,
      };
    });
    incidentStats.rows.forEach((r) => {
      if (!merged[r.county]) {
        merged[r.county] = { county: r.county, stations_reported: 0, avg_queue_length: 0, total_incidents: 0, open_incidents: 0 };
      }
      merged[r.county].total_incidents = parseInt(r.total_incidents, 10);
      merged[r.county].open_incidents = parseInt(r.open_incidents, 10);
    });

    res.json(Object.values(merged).sort((a, b) => b.total_incidents - a.total_incidents));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load county comparison' });
  }
});

module.exports = router;
