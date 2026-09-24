import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { api } from '../api/client';
import { getSocket } from '../api/socket';
import { useLang } from '../i18n.jsx';

const CATEGORY_LABELS = {
  device_failure: 'Device Failure',
  material_shortage: 'Material Shortage',
  security_incident: 'Security',
  queue_delay: 'Queue Delay',
  other: 'Other',
};

export default function Dashboard() {
  const { t } = useLang();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [byCounty, setByCounty] = useState([]);
  const [error, setError] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(api.exportIncidentsUrl(), {
        headers: { Authorization: `Bearer ${api.getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iebc_incidents_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function load() {
    try {
      const [summaryData, trendsData, countyData] = await Promise.all([
        api.dashboardSummary(),
        api.trends(),
        api.byCounty(),
      ]);
      setSummary(summaryData);
      setTrends(trendsData);
      setByCounty(countyData);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();

    // Still poll every 30s as a fallback, but the socket makes updates feel instant
    const interval = setInterval(load, 30000);

    const socket = getSocket();
    socket.on('connect', () => setLiveConnected(true));
    socket.on('disconnect', () => setLiveConnected(false));
    socket.on('station_report', load);
    socket.on('new_incident', load);
    socket.on('incident_updated', load);

    return () => {
      clearInterval(interval);
      socket.off('station_report', load);
      socket.off('new_incident', load);
      socket.off('incident_updated', load);
    };
  }, []);

  if (error) {
    return <div style={styles.errorBox}>{error}</div>;
  }

  if (!summary) {
    return <div style={styles.loading}>Loading overview…</div>;
  }

  const chartData = summary.incidents_by_category.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    total: parseInt(c.total, 10),
  }));

  const trendData = trends.map((t) => ({
    time: new Date(t.hour).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    Incidents: t.incidents,
    Reports: t.reports,
  }));

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>Election Day Overview</div>
            <h1 style={styles.h1}>{t('operationsSummary')}</h1>
          </div>
          <div style={styles.headerActions}>
            {liveConnected && (
              <div style={styles.liveBadge}>
                <span style={styles.liveDot} /> {t('liveUpdates')}
              </div>
            )}
            <button onClick={handleExport} style={styles.exportBtn} disabled={exporting}>
              {exporting ? 'Preparing…' : t('downloadReport')}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.statGrid}>
        <StatCard label={t('stationsReporting')} value={summary.stations_reported} />
        <StatCard label={t('openIncidents')} value={summary.open_incidents} accent="warn" />
        <StatCard label={t('avgQueue')} value={Math.round(summary.avg_queue_length)} suffix=" people" />
      </div>

      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>{t('incidentsByCategory')}</div>
        {chartData.length === 0 ? (
          <div style={styles.emptyChart}>No incidents reported yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8A7A63' }} axisLine={{ stroke: '#E7DCC8' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8A7A63' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E7DCC8', fontSize: 13 }}
              />
              <Bar dataKey="total" fill="#DD9C00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ ...styles.chartCard, marginTop: 20 }}>
        <div style={styles.chartTitle}>Activity Over Time</div>
        {trendData.length === 0 ? (
          <div style={styles.emptyChart}>Not enough data yet to show a trend.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC8" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#8A7A63' }} axisLine={{ stroke: '#E7DCC8' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8A7A63' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7DCC8', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Line type="monotone" dataKey="Reports" stroke="#283B0A" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Incidents" stroke="#B3261E" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ ...styles.chartCard, marginTop: 20 }}>
        <div style={styles.chartTitle}>Comparison by County</div>
        {byCounty.length === 0 ? (
          <div style={styles.emptyChart}>No county data yet.</div>
        ) : (
          <table style={styles.countyTable}>
            <thead>
              <tr>
                <th style={styles.countyTh}>County</th>
                <th style={styles.countyTh}>Stations Reporting</th>
                <th style={styles.countyTh}>Avg Queue</th>
                <th style={styles.countyTh}>Total Incidents</th>
                <th style={styles.countyTh}>Open Incidents</th>
              </tr>
            </thead>
            <tbody>
              {byCounty.map((c) => (
                <tr key={c.county}>
                  <td style={styles.countyTd}>{c.county}</td>
                  <td style={styles.countyTd}>{c.stations_reported}</td>
                  <td style={styles.countyTd}>{c.avg_queue_length || '—'}</td>
                  <td style={styles.countyTd}>{c.total_incidents}</td>
                  <td style={{ ...styles.countyTd, color: c.open_incidents > 0 ? 'var(--error)' : 'inherit', fontWeight: c.open_incidents > 0 ? 600 : 400 }}>
                    {c.open_incidents}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix = '', accent }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: accent === 'warn' ? '#DD9C00' : '#563D23' }}>
        {value}{suffix}
      </div>
    </div>
  );
}

const styles = {
  header: { marginBottom: 28 },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--dark-moss)',
    fontWeight: 500,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--dark-moss)',
    display: 'inline-block',
  },
  exportBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--cafe-noir)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--harvest-gold)',
    fontWeight: 600,
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    fontWeight: 600,
    margin: 0,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '20px 22px',
  },
  statLabel: {
    fontSize: 12.5,
    color: 'var(--muted)',
    fontWeight: 500,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 30,
    fontWeight: 600,
  },
  chartCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '22px 24px',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
  },
  emptyChart: {
    padding: '40px 0',
    textAlign: 'center',
    color: 'var(--muted)',
    fontSize: 13.5,
  },
  countyTable: { width: '100%', borderCollapse: 'collapse' },
  countyTh: {
    textAlign: 'left',
    fontSize: 11.5,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontWeight: 600,
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  countyTd: {
    padding: '10px 12px',
    fontSize: 13.5,
    borderBottom: '1px solid var(--border)',
  },
  loading: { color: 'var(--muted)', fontSize: 14 },
  errorBox: {
    padding: 16,
    background: '#FBEAE8',
    border: '1px solid #E5B4AE',
    borderRadius: 9,
    color: 'var(--error)',
    fontSize: 13.5,
  },
};
