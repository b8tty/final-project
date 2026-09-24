import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLang } from '../i18n.jsx';

export default function Layout({ children, onLogout }) {
  const { lang, setLang, t } = useLang();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.seal}>IEBC</div>
          <div>
            <div style={styles.brandTitle}>{t('operationsConsole')}</div>
            <div style={styles.brandSub}>{t('electionDayHq')}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <NavItem to="/" label={t('overview')} end />
          <NavItem to="/map" label={t('map')} />
          <NavItem to="/incidents" label={t('incidents')} />
          <NavItem to="/stations" label={t('stationsSchedules')} />
        </nav>

        <div style={styles.langToggle}>
          <button
            style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            style={{ ...styles.langBtn, ...(lang === 'sw' ? styles.langBtnActive : {}) }}
            onClick={() => setLang('sw')}
          >
            SW
          </button>
        </div>

        <button style={styles.logout} onClick={onLogout}>{t('signOut')}</button>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

function NavItem({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...styles.navItem,
        ...(isActive ? styles.navItemActive : {}),
      })}
    >
      {label}
    </NavLink>
  );
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 240,
    background: 'var(--cafe-noir)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 20px',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  seal: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: 10.5,
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  brandSub: {
    fontSize: 11.5,
    opacity: 0.7,
    marginTop: 2,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  langToggle: {
    display: 'flex',
    gap: 6,
    marginBottom: 12,
  },
  langBtn: {
    flex: 1,
    padding: '7px 0',
    borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 600,
  },
  langBtnActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  navItem: {
    display: 'block',
    padding: '11px 14px',
    borderRadius: 9,
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  logout: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'rgba(255,255,255,0.85)',
    padding: '10px 14px',
    borderRadius: 9,
    fontSize: 13.5,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: '32px 40px',
    maxWidth: 1100,
  },
};
