import React, { useState } from 'react';
import { api } from '../api/client';

export default function Login({ onLogin }) {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(nationalId, password);
      if (!['admin', 'county_coordinator'].includes(data.user.role)) {
        setError('This dashboard is for HQ staff only. Field officers should use the mobile app.');
        return;
      }
      api.setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>IEBC Headquarters</div>
        <h1 style={styles.h1}>Election Operations Console</h1>
        <p style={styles.sub}>Sign in with your HQ staff credentials</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
          <label style={styles.label}>National ID</label>
          <input
            style={styles.input}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="e.g. 12345678"
          />

          <label style={{ ...styles.label, marginTop: 16 }}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--background)',
    padding: 20,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--harvest-gold)',
    fontWeight: 600,
    marginBottom: 10,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 26,
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.25,
  },
  sub: {
    color: 'var(--muted)',
    fontSize: 14,
    marginTop: 8,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: 9,
    fontSize: 14,
    background: 'var(--background)',
    color: 'var(--cafe-noir)',
  },
  error: {
    marginTop: 14,
    padding: '10px 12px',
    background: '#FBEAE8',
    border: '1px solid #E5B4AE',
    borderRadius: 9,
    color: 'var(--error)',
    fontSize: 13,
  },
  button: {
    width: '100%',
    marginTop: 24,
    padding: 13,
    background: 'var(--cafe-noir)',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    fontSize: 14.5,
    fontWeight: 600,
  },
};
