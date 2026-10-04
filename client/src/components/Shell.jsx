import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { ROLE_LABELS, formatDateTime } from '../lib/labels';
import Toasts from './Toasts';

const NAV = {
  applicant: [
    { section: 'My passport' },
    { to: '/dashboard', label: 'Overview', icon: '🏠' },
    { to: '/applications', label: 'My applications', icon: '📄' },
    { to: '/appointments', label: 'My visits', icon: '📅' },
    { section: 'Account' },
    { to: '/profile', label: 'My details', icon: '👤' },
    { to: '/help', label: 'Help', icon: '💬' }
  ],
  verifier: [
    { section: 'Daily work' },
    { to: '/console/verifications', label: 'Documents to check', icon: '🔍' },
    { to: '/console/applications', label: 'All applications', icon: '🗂️' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { section: 'Account' },
    { to: '/profile', label: 'My details', icon: '👤' }
  ],
  officer: [
    { section: 'Daily work' },
    { to: '/console/approvals', label: 'Applications to approve', icon: '🧑‍✈️' },
    { to: '/console/applications', label: 'All applications', icon: '🗂️' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { section: 'Account' },
    { to: '/profile', label: 'My details', icon: '👤' }
  ],
  admin: [
    { section: 'Control room' },
    { to: '/admin', label: 'Overview', icon: '🏠' },
    { to: '/console/verifications', label: 'Documents to check', icon: '🔍' },
    { to: '/console/approvals', label: 'Applications to approve', icon: '🧑‍✈️' },
    { section: 'Manage' },
    { to: '/admin/users', label: 'People & roles', icon: '👥' },
    { to: '/admin/offices', label: 'Passport offices', icon: '🏢' },
    { to: '/admin/slots', label: 'Visit time slots', icon: '⏰' },
    { to: '/reports', label: 'Reports', icon: '📊' },
    { to: '/admin/audit', label: 'Audit trail', icon: '🧾' },
    { section: 'Account' },
    { to: '/profile', label: 'My details', icon: '👤' }
  ]
};

const TITLES = [
  [/^\/dashboard$/, 'Your passport dashboard', 'Home'],
  [/^\/applications$/, 'My applications', 'My passport'],
  [/^\/applications\/new/, 'Apply for a passport', 'My passport'],
  [/^\/applications\/[^/]+/, 'Track your application', 'My passport'],
  [/^\/appointments/, 'Your visits', 'My passport'],
  [/^\/profile/, 'My details', 'Account'],
  [/^\/help/, 'Help centre', 'Support'],
  [/^\/console\/verifications/, 'Documents waiting for a check', 'Daily work'],
  [/^\/console\/approvals/, 'Applications waiting for approval', 'Daily work'],
  [/^\/console\/applications/, 'All applications', 'Daily work'],
  [/^\/admin$/, 'Control room', 'Manage'],
  [/^\/admin\/users/, 'People & roles', 'Manage'],
  [/^\/admin\/offices/, 'Passport offices', 'Manage'],
  [/^\/admin\/slots/, 'Visit time slots', 'Manage'],
  [/^\/admin\/audit/, 'Audit trail', 'Manage'],
  [/^\/reports/, 'Reports', 'Daily work']
];

function titleFor(pathname) {
  const match = TITLES.find(([pattern]) => pattern.test(pathname));
  return match ? { title: match[1], crumb: match[2] } : { title: 'Passport Seva', crumb: '' };
}

function Notifications() {
  const { unread, setUnread, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    api
      .get('/dashboard/notifications')
      .then((data) => {
        setItems(data.data.notifications);
        setUnread(data.data.unread);
      })
      .catch((err) => notify(err));

    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, notify, setUnread]);

  const markAll = async () => {
    try {
      await api.patch('/dashboard/notifications/all');
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) {
      notify(err);
    }
  };

  return (
    <div className="dropdown" ref={boxRef}>
      <button
        type="button"
        className={`btn btn-outline btn-sm ${unread > 0 ? 'notification-dot' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        🔔 {unread > 0 ? unread : ''}
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="row-between" style={{ padding: '8px 10px' }}>
            <strong className="small">What is new</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={markAll}>
              Mark all as read
            </button>
          </div>
          {items.length === 0 && <div className="dropdown-item"><span>No messages yet.</span></div>}
          {items.map((item) => (
            <div className="dropdown-item" key={item._id}>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
              <span className="tiny muted">{formatDateTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { title, crumb } = titleFor(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const items = NAV[user.role] || [];
  const initials = (user.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">🛂</span>
          <span>
            Passport Seva
            <span className="brand-sub">Apply · Track · Collect</span>
          </span>
        </Link>

        {items.map((item, index) =>
          item.section ? (
            <div className="side-label" key={`${item.section}-${index}`}>
              {item.section}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <span className="side-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        )}

        <div className="side-foot">
          <div className="row">
            <span className="avatar">{initials}</span>
            <div style={{ minWidth: 0 }}>
              <div className="small" style={{ color: '#fff', fontWeight: 700 }}>
                {user.name}
              </div>
              <div className="tiny">{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="mobile-bar">
            <button
              type="button"
              className="nav-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>

          <div>
            {crumb && <div className="crumb">{crumb}</div>}
            <h2>{title}</h2>
          </div>

          <div className="row">
            <Notifications />
            <Link to="/profile" className="row" style={{ gap: 10 }}>
              <span className="avatar">{initials}</span>
              <div className="small" style={{ display: 'none' }} />
            </Link>
            <button className="btn btn-outline btn-sm" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>

      <Toasts />
    </div>
  );
}
