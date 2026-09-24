const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('iebc_admin_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  login: (national_id, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ national_id, password }),
    }),

  dashboardSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/dashboard${qs ? `?${qs}` : ''}`);
  },

  trends: () => request('/reports/trends'),
  byCounty: () => request('/reports/by-county'),

  listIncidents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/incidents${qs ? `?${qs}` : ''}`);
  },

  updateIncidentStatus: (id, status) =>
    request(`/reports/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listStations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/stations${qs ? `?${qs}` : ''}`);
  },

  stationsMap: () => request('/stations/map'),

  exportIncidentsUrl: () => `${API_BASE}/reports/export`,

  updateStationSchedule: (id, payload) =>
    request(`/stations/${id}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  setToken: (token) => localStorage.setItem('iebc_admin_token', token),
  clearToken: () => localStorage.removeItem('iebc_admin_token'),
  getToken,
  apiBase: API_BASE,
};
