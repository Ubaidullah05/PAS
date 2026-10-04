import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_LABELS } from '../lib/labels';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/track', label: 'Track application' },
  { to: '/help', label: 'Help' }
];

export default function Navbar() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">🛂</span>
          <span>
            Passport Seva
            <span className="brand-sub">Apply · Track · Collect</span>
          </span>
        </Link>

        <nav className="nav-links" style={open ? { display: 'flex' } : undefined}>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="role-chip">{ROLE_LABELS[user.role]}</span>
              <Link className="btn btn-primary btn-sm" to="/dashboard">
                My dashboard
              </Link>
              <button className="btn btn-outline btn-sm" type="button" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" to="/login">
                Sign in
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Create account
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label="Show menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
