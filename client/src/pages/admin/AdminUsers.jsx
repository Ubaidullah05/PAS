import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { EmptyState, Loader } from '../../components/ui';
import { ROLE_LABELS, formatDate } from '../../lib/labels';

const ROLE_OPTIONS = ['applicant', 'verifier', 'officer', 'admin'];

const BLANK = { name: '', email: '', password: '', role: 'applicant', phone: '' };

export default function AdminUsers() {
  const { notify, pushToast, user: me } = useApp();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch((err) => notify(err));

  useEffect(() => {
    Promise.all([load(), api.get('/admin/roles').catch(() => null)])
      .then(([, roleRes]) => setRoles(roleRes?.data.roles || []))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = users.filter((item) => {
    const needle = search.trim().toLowerCase();
    if (roleFilter && item.role !== roleFilter) return false;
    if (!needle) return true;
    return item.name.toLowerCase().includes(needle) || item.email.toLowerCase().includes(needle);
  });

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/admin/users', form);
      pushToast('success', 'Account created', res.message);
      setForm(BLANK);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const change = async (item, patch, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const res = await api.patch(`/admin/users/${item._id}`, patch);
      pushToast('success', 'Saved', res.message);
      await load();
    } catch (err) {
      notify(err);
    }
  };

  if (loading) return <Loader label="Loading accounts…" />;

  return (
    <>
      <form className="panel" onSubmit={create}>
        <div className="panel-head">
          <strong>Add a person</strong>
          <span className="tiny muted">They can change their password after signing in</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label className="label">Full name</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Temporary password</label>
              <input
                className="input"
                type="text"
                required
                placeholder="At least 8 characters with a number"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">What can this person do?</label>
              <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">Manage</div>
          <h2 style={{ fontSize: '1.4rem' }}>People &amp; roles</h2>
          <p className="muted small">Change what someone is allowed to do, or suspend their account.</p>
        </div>
        <div className="row">
          <input
            className="input"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Every role</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>{filtered.length} account(s)</strong>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="👥" title="No accounts match" text="Try a different search." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isSelf = item._id === me._id;
                  return (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="tiny muted">{item.email}</div>
                      </td>
                      <td>
                        <select
                          className="select select-sm"
                          value={item.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            change(
                              item,
                              { role: e.target.value },
                              `Change ${item.name} to ${ROLE_LABELS[e.target.value]}? They may gain or lose access right away.`
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`badge badge-${item.status === 'active' ? 'success' : 'danger'}`}>
                          {item.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="muted">{formatDate(item.createdAt)}</td>
                      <td>
                        {isSelf ? (
                          <span className="tiny muted">That is you</span>
                        ) : item.status === 'active' ? (
                          <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            onClick={() =>
                              change(item, { status: 'suspended' }, `Suspend ${item.name}? They will not be able to sign in.`)
                            }
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            type="button"
                            onClick={() => change(item, { status: 'active' })}
                          >
                            Re-activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {roles.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <strong>What each role means</strong>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Number of permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((item) => (
                  <tr key={item.role}>
                    <td>
                      <strong>{ROLE_LABELS[item.role]}</strong>
                    </td>
                    <td className="muted">{item.permissions.length} things this role may do</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
