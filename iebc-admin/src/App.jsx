import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api/client';
import { LangProvider } from './i18n.jsx';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import Stations from './pages/Stations.jsx';
import MapView from './pages/MapView.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!api.getToken());

  useEffect(() => {
    setAuthed(!!api.getToken());
  }, []);

  if (!authed) {
    return (
      <LangProvider>
        <Login onLogin={() => setAuthed(true)} />
      </LangProvider>
    );
  }

  return (
    <LangProvider>
      <BrowserRouter>
        <Layout onLogout={() => { api.clearToken(); setAuthed(false); }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LangProvider>
  );
}
