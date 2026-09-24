import React, { createContext, useContext, useState } from 'react';

const STRINGS = {
  en: {
    overview: 'Overview',
    incidents: 'Incidents',
    stationsSchedules: 'Stations & Schedules',
    map: 'Map',
    signOut: 'Sign Out',
    operationsConsole: 'Operations Console',
    electionDayHq: 'Election Day HQ',
    operationsSummary: 'Operations Summary',
    stationsReporting: 'Stations Reporting',
    openIncidents: 'Open Incidents',
    avgQueue: 'Average Queue Length',
    incidentsByCategory: 'Incidents by Category',
    downloadReport: 'Download Report (CSV)',
    liveUpdates: 'Live updates connected',
    urgent: 'Urgent',
    all: 'All',
    station: 'Station',
    category: 'Category',
    description: 'Description',
    reportedBy: 'Reported By',
    status: 'Status',
    setSchedule: 'Set Schedule',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search by station name or code…',
    registeredVoters: 'Registered Voters',
    schedule: 'Schedule',
    noReportsYet: 'No reports yet',
  },
  sw: {
    overview: 'Muhtasari',
    incidents: 'Matukio',
    stationsSchedules: 'Vituo na Ratiba',
    map: 'Ramani',
    signOut: 'Ondoka',
    operationsConsole: 'Kituo cha Uendeshaji',
    electionDayHq: 'Makao Makuu ya Siku ya Uchaguzi',
    operationsSummary: 'Muhtasari wa Uendeshaji',
    stationsReporting: 'Vituo Vinavyoripoti',
    openIncidents: 'Matukio Yaliyo Wazi',
    avgQueue: 'Wastani wa Urefu wa Foleni',
    incidentsByCategory: 'Matukio kwa Aina',
    downloadReport: 'Pakua Ripoti (CSV)',
    liveUpdates: 'Sasisho za moja kwa moja zimeunganishwa',
    urgent: 'Haraka',
    all: 'Zote',
    station: 'Kituo',
    category: 'Aina',
    description: 'Maelezo',
    reportedBy: 'Aliyeripoti',
    status: 'Hali',
    setSchedule: 'Weka Ratiba',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    search: 'Tafuta kwa jina la kituo au nambari…',
    registeredVoters: 'Wapiga Kura Waliosajiliwa',
    schedule: 'Ratiba',
    noReportsYet: 'Hakuna ripoti bado',
  },
};

const LangContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key) => STRINGS[lang][key] || key;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
