import { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { ROLE_LABELS } from '../lib/labels';

export default function Profile() {
  const { user, setUser, notify, pushToast, logout } = useApp();
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || ''
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const updatePassword = (key) => (event) => setPasswords({ ...passwords, [key]: event.target.value });

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api.put('/auth/profile', form);
      setUser(res.data.user);
      pushToast('success', 'Saved', 'Your details were updated.');
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      return pushToast('warning', 'Check the passwords', 'Both new passwords must match.');
    }
    setBusy(true);
    try {
      const res = await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      pushToast('success', 'Password changed', res.message);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      logout();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="card card-pad row" style={{ gap: 18 }}>
        <span className="avatar" style={{ width: 66, height: 66, fontSize: '1.4rem' }}>
          {initials}
        </span>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>{user.name}</h2>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <span className="role-chip">{ROLE_LABELS[user.role]}</span>
            <span className="tiny muted">{user.email}</span>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <form className="panel" onSubmit={save}>
          <div className="panel-head">
            <strong>Your details</strong>
          </div>
          <div className="panel-body stack">
            <div className="field">
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={update('name')} />
            </div>
            <div className="field">
              <label className="label">Email address</label>
              <input className="input" type="email" value={form.email} onChange={update('email')} />
            </div>
            <div className="field">
              <label className="label">Phone number</label>
              <input className="input" value={form.phone} onChange={update('phone')} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Save changes'}
            </button>
          </div>
        </form>

        <form className="panel" onSubmit={changePassword}>
          <div className="panel-head">
            <strong>Change your password</strong>
          </div>
          <div className="panel-body stack">
            <div className="field">
              <label className="label">Current password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={updatePassword('currentPassword')}
              />
            </div>
            <div className="field">
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters with a letter and a number"
                value={passwords.newPassword}
                onChange={updatePassword('newPassword')}
              />
            </div>
            <div className="field">
              <label className="label">Repeat new password</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={updatePassword('confirm')}
              />
            </div>
            <button className="btn btn-navy" type="submit" disabled={busy}>
              Update password
            </button>
            <p className="tiny muted">
              For your safety, you will be signed out on every device after changing your password.
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
