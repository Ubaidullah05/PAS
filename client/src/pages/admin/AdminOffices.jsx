import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { EmptyState, Loader } from '../../components/ui';

const BLANK = { code: '', name: '', city: '', state: '', address: '', phone: '', openingHour: '09:00', closingHour: '17:00' };

export default function AdminOffices() {
  const { notify, pushToast } = useApp();
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () =>
    api
      .get('/appointments/offices')
      .then((res) => setOffices(res.data.data.offices))
      .catch((err) => notify(err));

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const res = await api.patch(`/admin/offices/${editing}`, form);
        pushToast('success', 'Office updated', res.message);
      } else {
        const res = await api.post('/admin/offices', form);
        pushToast('success', 'Office added', res.message);
      }
      setForm(BLANK);
      setEditing(null);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (office) => {
    setEditing(office._id);
    setForm({
      code: office.code,
      name: office.name,
      city: office.city,
      state: office.state,
      address: office.address,
      phone: office.phone || '',
      openingHour: office.openingHour || '09:00',
      closingHour: office.closingHour || '17:00'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggle = async (office) => {
    try {
      const res = await api.patch(`/admin/offices/${office._id}`, { active: !office.active });
      pushToast('success', 'Saved', res.message);
      await load();
    } catch (err) {
      notify(err);
    }
  };

  const remove = async (office) => {
    if (!window.confirm(`Remove ${office.name}? If it has applications we will simply switch it off.`)) return;
    try {
      const res = await api.delete(`/admin/offices/${office._id}`);
      pushToast('info', 'Done', res.message);
      await load();
    } catch (err) {
      notify(err);
    }
  };

  if (loading) return <Loader label="Loading passport offices…" />;

  return (
    <>
      <form className="panel" onSubmit={submit}>
        <div className="panel-head">
          <strong>{editing ? 'Edit this office' : 'Add a passport office'}</strong>
          {editing && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(BLANK);
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label className="label">Short code</label>
              <input
                className="input"
                required
                placeholder="For example: MUM-01"
                value={form.code}
                onChange={update('code')}
              />
            </div>
            <div className="field">
              <label className="label">Office name</label>
              <input className="input" required value={form.name} onChange={update('name')} />
            </div>
            <div className="field">
              <label className="label">City</label>
              <input className="input" required value={form.city} onChange={update('city')} />
            </div>
            <div className="field">
              <label className="label">State</label>
              <input className="input" required value={form.state} onChange={update('state')} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Address</label>
              <input className="input" required value={form.address} onChange={update('address')} />
            </div>
            <div className="field">
              <label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={update('phone')} />
            </div>
            <div className="field">
              <label className="label">Opens at</label>
              <input className="input" type="time" value={form.openingHour} onChange={update('openingHour')} />
            </div>
            <div className="field">
              <label className="label">Closes at</label>
              <input className="input" type="time" value={form.closingHour} onChange={update('closingHour')} />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? <span className="spinner" /> : editing ? 'Save changes' : 'Add office'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <strong>{offices.length} passport office(s)</strong>
          <span className="tiny muted">Switched-off offices stop appearing to applicants</span>
        </div>
        {offices.length === 0 ? (
          <EmptyState icon="🏢" title="No offices yet" text="Add the first passport office above." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Office</th>
                  <th>Where</th>
                  <th>Working hours</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offices.map((office) => (
                  <tr key={office._id}>
                    <td>
                      <strong>{office.name}</strong>
                      <div className="tiny muted">{office.code}</div>
                    </td>
                    <td>
                      {office.city}, {office.state}
                      <div className="tiny muted">{office.address}</div>
                    </td>
                    <td className="muted">
                      {office.openingHour || '09:00'} – {office.closingHour || '17:00'}
                    </td>
                    <td>
                      <span className={`badge badge-${office.active ? 'success' : 'neutral'}`}>
                        {office.active ? 'Open' : 'Switched off'}
                      </span>
                    </td>
                    <td>
                      <div className="row">
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => startEdit(office)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggle(office)}>
                          {office.active ? 'Switch off' : 'Re-open'}
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(office)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
