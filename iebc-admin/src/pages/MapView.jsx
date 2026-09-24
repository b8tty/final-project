import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { getSocket } from '../api/socket';

const CATEGORY_LABELS = {
  device_failure: 'Device Failure',
  material_shortage: 'Material Shortage',
  security_incident: 'Security',
  queue_delay: 'Queue Delay',
  other: 'Other',
};

export default function MapView() {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [error, setError] = useState(null);
  const [stationCount, setStationCount] = useState(0);
  const [selectedStation, setSelectedStation] = useState(null); // the clicked pin's station data
  const [stationIncidents, setStationIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  function colorFor(station) {
    if (station.open_incidents > 0) return '#B3261E'; // red — active incident
    if (!station.submitted_at) return '#8A7A63'; // gray — no report yet
    if (station.queue_length > 60) return '#DD9C00'; // gold — queue building
    return '#283B0A'; // green — all clear
  }

  async function openStationPanel(station) {
    setSelectedStation(station);
    setIncidentsLoading(true);
    try {
      const incidents = await api.listIncidents({ polling_station_id: station.id });
      setStationIncidents(incidents);
    } catch (err) {
      setStationIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }

  async function loadStations() {
    try {
      const stations = await api.stationsMap();
      setStationCount(stations.length);
      setError(null);

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      stations.forEach((s) => {
        const marker = window.L.circleMarker([s.latitude, s.longitude], {
          radius: 9,
          fillColor: colorFor(s),
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(leafletMapRef.current);

        // Hover shows a quick summary; clicking opens the full incident list for that station
        marker.bindTooltip(`
          <div style="font-family: Inter, sans-serif;">
            <div style="font-weight:600; font-size:12.5px;">${s.name}</div>
            <div style="font-size:11.5px; color:#8A7A63;">Click for details</div>
          </div>
        `);

        marker.on('click', () => openStationPanel(s));

        markersRef.current.push(marker);
      });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!leafletMapRef.current) {
      leafletMapRef.current = window.L.map(mapRef.current).setView([-1.2921, 36.8219], 7);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMapRef.current);
    }

    loadStations();

    const socket = getSocket();
    socket.on('station_report', loadStations);
    socket.on('new_incident', loadStations);
    socket.on('incident_updated', loadStations);

    return () => {
      socket.off('station_report', loadStations);
      socket.off('new_incident', loadStations);
      socket.off('incident_updated', loadStations);
    };
  }, []);

  // Keep the open panel's incident list fresh if a new one comes in while it's open
  useEffect(() => {
    if (!selectedStation) return;
    const socket = getSocket();
    const refresh = () => openStationPanel(selectedStation);
    socket.on('new_incident', refresh);
    socket.on('incident_updated', refresh);
    return () => {
      socket.off('new_incident', refresh);
      socket.off('incident_updated', refresh);
    };
  }, [selectedStation]);

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.eyebrow}>Live Situational View</div>
        <h1 style={styles.h1}>Polling Station Map</h1>
        <p style={styles.desc}>{stationCount} stations with recorded coordinates. Click a pin to see its reported incidents.</p>
      </div>

      <div style={styles.legend}>
        <LegendItem color="#283B0A" label="All clear" />
        <LegendItem color="#DD9C00" label="Queue building" />
        <LegendItem color="#B3261E" label="Active incident" />
        <LegendItem color="#8A7A63" label="No report yet" />
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.layoutRow}>
        <div ref={mapRef} style={{ ...styles.mapContainer, flex: selectedStation ? 2 : 1 }} />

        {selectedStation && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelStationName}>{selectedStation.name}</div>
                <div style={styles.panelLocation}>{selectedStation.constituency}, {selectedStation.county}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedStation(null)}>×</button>
            </div>

            <div style={styles.panelStats}>
              <div><span style={styles.panelStatLabel}>Queue</span> {selectedStation.queue_length ?? '—'}</div>
              <div><span style={styles.panelStatLabel}>Devices</span> {selectedStation.kiems_status ?? 'No report yet'}</div>
            </div>

            <div style={styles.panelDivider} />

            <div style={styles.panelSectionTitle}>Reported Incidents</div>

            {incidentsLoading ? (
              <div style={styles.panelEmpty}>Loading…</div>
            ) : stationIncidents.length === 0 ? (
              <div style={styles.panelEmpty}>No incidents reported at this station.</div>
            ) : (
              <div style={styles.incidentList}>
                {stationIncidents.map((inc) => (
                  <div key={inc.id} style={styles.incidentCard}>
                    <div style={styles.incidentTop}>
                      <span style={styles.incidentCategory}>{CATEGORY_LABELS[inc.category] || inc.category}</span>
                      <span style={{ ...styles.incidentStatus, ...statusStyle(inc.status) }}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={styles.incidentDesc}>{inc.description}</div>
                    <div style={styles.incidentMeta}>
                      {inc.reported_by} · {new Date(inc.occurred_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function statusStyle(status) {
  if (status === 'resolved') return { background: 'rgba(40,59,10,0.12)', color: 'var(--dark-moss, #283B0A)' };
  if (status === 'in_progress') return { background: 'rgba(221,156,0,0.15)', color: '#8a6400' };
  return { background: 'rgba(179,38,30,0.1)', color: '#B3261E' };
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</span>
    </div>
  );
}

const styles = {
  header: { marginBottom: 16 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--harvest-gold)',
    fontWeight: 600,
    marginBottom: 6,
  },
  h1: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0 },
  desc: { fontSize: 13.5, color: 'var(--muted)', marginTop: 8 },
  legend: {
    display: 'flex',
    gap: 20,
    marginBottom: 16,
    padding: '10px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    width: 'fit-content',
  },
  layoutRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  mapContainer: {
    height: 520,
    borderRadius: 12,
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  panel: {
    flex: 1,
    minWidth: 300,
    maxWidth: 360,
    height: 520,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 18,
    overflowY: 'auto',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  panelStationName: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 600,
  },
  panelLocation: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 20,
    lineHeight: 1,
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: 0,
  },
  panelStats: {
    display: 'flex',
    gap: 20,
    fontSize: 13,
    marginBottom: 14,
  },
  panelStatLabel: {
    color: 'var(--muted)',
    fontSize: 11.5,
    display: 'block',
    marginBottom: 2,
  },
  panelDivider: {
    borderTop: '1px solid var(--border)',
    margin: '4px 0 14px',
  },
  panelSectionTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--muted)',
    marginBottom: 10,
  },
  panelEmpty: {
    fontSize: 13,
    color: 'var(--muted)',
    padding: '12px 0',
  },
  incidentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  incidentCard: {
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 12,
  },
  incidentTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  incidentCategory: {
    fontSize: 12.5,
    fontWeight: 600,
  },
  incidentStatus: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 10,
    textTransform: 'capitalize',
  },
  incidentDesc: {
    fontSize: 12.5,
    color: 'var(--cafe-noir)',
    marginBottom: 6,
  },
  incidentMeta: {
    fontSize: 11,
    color: 'var(--muted)',
  },
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
