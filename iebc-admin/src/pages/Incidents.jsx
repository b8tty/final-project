import React, { useEffect, useState } from 'react';
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

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];
const URGENT_THRESHOLD_MS = 30 * 60 * 1000; // flag as urgent if open > 30 minutes

function isUrgent(incident) {
  if (incident.status === 'resolved') return false;
  const age = Date.now() - new Date(incident.occurred_at).getTime();
  return age > URGENT_THRESHOLD_MS;
}

export default function Incidents() {
  const { t } = useLang();
  const [incidents, setIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await api.listIncidents(params);
      // Urgent incidents surface to the top, regardless of report order
      data.sort((a, b) => (isUrgent(b) ? 1 : 0) - (isUrgent(a) ? 1 : 0));
      setIncidents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);

    const socket = getSocket();
    socket.on('new_incident', load);
    socket.on('incident_updated', load);

    return () => {
      clearInterval(interval);
      socket.off('new_incident', load);
      socket.off('incident_updated', load);
    };
  }, [statusFilter]);

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    try {
      await api.updateIncidentStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.eyebrow}>Election Day Incidents</div>
        <h1 style={styles.h1}>{t('incidents')}</h1>
      </div>

      <div style={styles.filterRow}>
        {['', 'open', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            style={{
              ...styles.filterBtn,
              ...(statusFilter === s ? styles.filterBtnActive : {}),
            }}
          >
            {s ? s.replace('_', ' ') : t('all')}
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.tableCard}>
        {incidents.length === 0 ? (
          <div style={styles.empty}>No incidents match this filter.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('station')}</th>
                <th style={styles.th}>{t('category')}</th>
                <th style={styles.th}>{t('description')}</th>
                <th style={styles.th}>{t('reportedBy')}</th>
                <th style={styles.th}>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} style={isUrgent(inc) ? styles.urgentRow : undefined}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {inc.station_name}
                      {isUrgent(inc) && <span style={styles.urgentTag}>{t('urgent')}</span>}
                    </div>
                    <div style={styles.subtext}>{inc.constituency}, {inc.county}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.categoryChip}>{CATEGORY_LABELS[inc.category] || inc.category}</span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: 280 }}>{inc.description}</td>
                  <td style={styles.td}>{inc.reported_by}</td>
                  <td style={styles.td}>
                    <select
                      value={inc.status}
                      onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                      disabled={updatingId === inc.id}
                      style={{
                        ...styles.statusSelect,
                        ...(inc.status === 'resolved' ? styles.statusResolved : {}),
                        ...(inc.status === 'in_progress' ? styles.statusProgress : {}),
                        ...(inc.status === 'open' ? styles.statusOpen : {}),
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
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

const styles = {
  header: { marginBottom: 20 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--harvest-gold)',
    fontWeight: 600,
    marginBottom: 6,
  },
  h1: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  filterBtnActive: {
    background: 'var(--cafe-noir)',
    color: '#fff',
    borderColor: 'var(--cafe-noir)',
  },
  tableCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 11.5,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontWeight: 600,
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '14px 18px',
    fontSize: 13.5,
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
  },
  subtext: { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  urgentRow: {
    background: 'rgba(179,38,30,0.05)',
  },
  urgentTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    background: 'var(--error)',
    color: '#fff',
  },
  categoryChip: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    background: 'var(--background)',
    border: '1px solid var(--border)',
  },
  statusSelect: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    fontSize: 12.5,
    fontWeight: 600,
    textTransform: 'capitalize',
    background: 'var(--surface)',
  },
  statusOpen: { color: 'var(--error)' },
  statusProgress: { color: 'var(--harvest-gold)' },
  statusResolved: { color: 'var(--dark-moss)' },
  empty: { padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 },
  errorBox: {
    padding: 14,
    marginBottom: 16,
    background: '#FBEAE8',
    border: '1px solid #E5B4AE',
    borderRadius: 9,
    color: 'var(--error)',
    fontSize: 13.5,
  },
};
