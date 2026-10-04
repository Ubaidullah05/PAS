import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_HOME } from '../lib/labels';

const DEMO = [
  { label: 'Applicant', email: 'demo@pas.gov.in', password: 'Demo@1234' },
  { label: 'Document verifier', email: 'verifier@pas.gov.in', password: 'Verify@123' },
  { label: 'Passport officer', email: 'officer@pas.gov.in', password: 'Officer@123' },
  { label: 'Administrator', email: 'admin@pas.gov.in', password: 'Admin@1234' }
];

export default function Login() {
  const { user, login, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  if (user) return <Navigate to={location.state?.from || ROLE_HOME[user.role]} replace />;

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Please enter a valid email address';
    if (!form.password) next.password = 'Please enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const signedIn = await login(form.email, form.password);
      navigate(location.state?.from || ROLE_HOME[signedIn.role], { replace: true });
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const fill = (account) => setForm({ email: account.email, password: account.password });

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <div className="eyebrow" style={{ color: '#7db2ff' }}>
          Welcome back
        </div>
        <h2>Your passport journey, picked up right where you left it.</h2>
        <p style={{ color: 'rgba(255,255,255,0.78)' }}>
          Sign in to see how your application is doing, upload any papers we asked for, or book the
          time of your visit.
        </p>
        <ul>
          <li><span>✅</span> See every step in plain words</li>
          <li><span>✅</span> Upload documents from your phone</li>
          <li><span>✅</span> Get a message the moment anything changes</li>
          <li><span>✅</span> Book or move your visit in a few taps</li>
        </ul>
      </div>

      <div className="auth-main">
        <form className="auth-card stack" onSubmit={submit} noValidate>
          <div>
            <h2 style={{ fontSize: '1.6rem' }}>Sign in</h2>
            <p className="muted small">Use your email address and password.</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={update('password')}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>

          <div className="auth-alt">
            New here? <Link to="/register">Create a free account</Link>
          </div>

          <div className="demo-box">
            <strong>Try it out</strong>
            <p style={{ margin: '6px 0 8px' }}>
              This is a demo system. Click a role to fill the box for you:
            </p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {DEMO.map((account) => (
                <button type="button" key={account.email} onClick={() => fill(account)}>
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
