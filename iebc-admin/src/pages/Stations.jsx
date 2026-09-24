import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useLang } from '../i18n.jsx';

export default function Stations() {
  const { t } = useLang();
  const [stations, setStations] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const params = search ? { search } : {};
      const data = await api.listStations(params);
      setStations(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce search
    return () => clearTimeout(timeout);
  }, [search]);

  function startEditing(station) {
    setEditingId(station.id);
    setOpenTime('');
    setCloseTime('');
  }

  async function saveSchedule(id) {
    setSaving(true);
    try {
      const payload = {};
      if (openTime) payload.estimated_opening_time = openTime;
      if (closeTime) payload.estimated_closing_time = closeTime;
      await api.updateStationSchedule(id, payload);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.eyebrow}>Voter-Facing Information</div>
        <h1 style={styles.h1}>{t('stationsSchedules')}</h1>
        <p style={styles.desc}>
          Set the estimated opening and closing time each station shows to voters on the public lookup portal.
        </p>
      </div>

      <input
        style={styles.search}
        placeholder={t('search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.tableCard}>
        {stations.length === 0 ? (
          <div style={styles.empty}>No stations found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{t('station')}</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>{t('registeredVoters')}</th>
                <th style={styles.th}>{t('schedule')}</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={styles.subtext}>{s.station_code}</div>
                  </td>
                  <td style={styles.td}>{s.constituency}, {s.county}</td>
                  <td style={styles.td}>{s.registered_voters}</td>
                  <td style={styles.td}>
                    {editingId === s.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="datetime-local"
                          style={styles.timeInput}
                          value={openTime}
                          onChange={(e) => setOpenTime(e.target.value)}
                        />
                        <span style={{ color: 'var(--muted)' }}>–</span>
                        <input
                          type="datetime-local"
                          style={styles.timeInput}
                          value={closeTime}
                          onChange={(e) => setCloseTime(e.target.value)}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        Not editing — click "Set Schedule"
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingId === s.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={styles.saveBtn} onClick={() => saveSchedule(s.id)} disabled={saving}>
                          {saving ? 'Saving…' : t('save')}
                        </button>
                        <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>{t('cancel')}</button>
                      </div>
                    ) : (
                      <button style={styles.editBtn} onClick={() => startEditing(s)}>{t('setSchedule')}</button>
                    )}
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
  desc: { fontSize: 13.5, color: 'var(--muted)', marginTop: 8, maxWidth: 520 },
  search: {
    width: '100%',
    maxWidth: 360,
    padding: '11px 14px',
    borderRadius: 9,
    border: '1px solid var(--border)',
    fontSize: 13.5,
    marginBottom: 20,
    background: 'var(--surface)',
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
    verticalAlign: 'middle',
  },
  subtext: { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  timeInput: {
    padding: '6px 8px',
    borderRadius: 7,
    border: '1px solid var(--border)',
    fontSize: 12.5,
  },
  editBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--background)',
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--cafe-noir)',
  },
  saveBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--cafe-noir)',
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--muted)',
  },
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
