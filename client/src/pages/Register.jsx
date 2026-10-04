import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_HOME } from '../lib/labels';

export default function Register() {
  const { user, register, notify } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    terms: false
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const update = (key) => (event) =>
    setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'Please enter a valid email address';
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) next.phone = 'Please enter a valid phone number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Use at least 8 characters with a letter and a number';
    }
    if (form.password !== form.confirm) next.confirm = 'Both passwords must match';
    if (!form.terms) next.terms = 'Please confirm you understand how we use your details';

    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email,
        phone: form.phone,
        password: form.password
      });
      navigate(ROLE_HOME[created.role], { replace: true });
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <div className="eyebrow" style={{ color: '#7db2ff' }}>
          One minute, that is all
        </div>
        <h2>Create your account and start your application.</h2>
        <p style={{ color: 'rgba(255,255,255,0.78)' }}>
          Only everyday applicants can sign up here. Office staff are given an account by the
          administrator, which keeps the system safe.
        </p>
        <ul>
          <li><span>🔒</span> Only applicants register themselves</li>
          <li><span>💾</span> Save your form and finish it later</li>
          <li><span>📩</span> Message you whenever something changes</li>
        </ul>
      </div>

      <div className="auth-main">
        <form className="auth-card stack" onSubmit={submit} noValidate>
          <div>
            <h2 style={{ fontSize: '1.6rem' }}>Create account</h2>
            <p className="muted small">It is free and only takes a moment.</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" placeholder="As it appears on your papers" value={form.name} onChange={update('name')} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" className="input" type="email" placeholder="you@example.com" value={form.email} onChange={update('email')} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" className="input" placeholder="Optional" value={form.phone} onChange={update('phone')} />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input id="password" className="input" type="password" placeholder="At least 8 characters" value={form.password} onChange={update('password')} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="confirm">Repeat password</label>
              <input id="confirm" className="input" type="password" placeholder="Type it again" value={form.confirm} onChange={update('confirm')} />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={form.terms} onChange={update('terms')} />
            <span>
              I understand that my details are used only to process my passport application and are
              kept private.
            </span>
          </label>
          {errors.terms && <span className="field-error">{errors.terms}</span>}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Create my account'}
          </button>

          <div className="auth-alt">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
