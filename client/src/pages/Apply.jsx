import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { Loader } from '../components/ui';

const OPTIONS = [
  { value: 'fresh', icon: '🛂', title: 'New passport', text: 'You have never had an Indian passport before.' },
  { value: 'renewal', icon: '🔄', title: 'Renew my passport', text: 'Your old passport expired, or is about to expire.' },
  { value: 'lost', icon: '🧾', title: 'Lost passport', text: 'Your passport is missing and you need a new one.' },
  { value: 'damaged', icon: '🗂️', title: 'Damaged passport', text: 'Your passport is torn, water damaged or unusable.' }
];

export default function Apply() {
  const navigate = useNavigate();
  const { notify, pushToast } = useApp();
  const [serviceType, setServiceType] = useState('fresh');
  const [category, setCategory] = useState('normal');
  const [office, setOffice] = useState('');
  const [offices, setOffices] = useState([]);
  const [officesLoaded, setOfficesLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/appointments/offices')
      .then((res) => {
        setOffices(res.data.offices);
        if (res.data.offices[0]) setOffice(res.data.offices[0]._id);
      })
      .catch((err) => notify(err))
      .finally(() => setOfficesLoaded(true));
  }, [notify]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await api.post('/applications', { serviceType, category, office });
      pushToast('success', 'Draft started', 'Fill in the details and send it whenever you are ready.');
      navigate(`/applications/${res.data.application._id}?edit=1`);
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  if (!officesLoaded) return <Loader label="Loading passport offices…" />;

  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="eyebrow">New application</div>
        <h2 style={{ fontSize: '1.5rem' }}>What do you need today?</h2>
        <p className="muted small">
          Pick the option that fits you best. You can save the form and finish it later — nothing is
          sent until you press send.
        </p>
      </div>

      <div className="grid-4">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="service-card"
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              borderColor: serviceType === option.value ? 'var(--blue-600)' : undefined,
              boxShadow: serviceType === option.value ? '0 14px 34px rgba(31,111,235,0.18)' : undefined
            }}
            onClick={() => setServiceType(option.value)}
          >
            <div className="service-icon">{option.icon}</div>
            <h3>{option.title}</h3>
            <p>{option.text}</p>
          </button>
        ))}
      </div>

      {offices.length === 0 && (
        <div className="alert alert-warning">
          <strong>No passport office is taking applications right now.</strong> Please come back a
          little later.
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <strong>Two quick choices</strong>
        </div>
        <div className="panel-body form-grid">
          <div className="field">
            <label className="label">How soon do you need it?</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="normal">Normal processing — standard fee</option>
              <option value="tatkal">Urgent (Tatkal) — faster, higher fee</option>
            </select>
            <span className="hint">Urgent applications are pushed to the front of the queue.</span>
          </div>
          <div className="field">
            <label className="label">Which office will you visit?</label>
            <select className="select" value={office} onChange={(e) => setOffice(e.target.value)}>
              <option value="">Choose an office</option>
              {offices.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} — {item.city}
                </option>
              ))}
            </select>
            <span className="hint">You can change this before you send the application.</span>
          </div>
        </div>
      </div>

      <div className="row">
        <button className="btn btn-primary" type="button" onClick={start} disabled={busy || !office}>
          {busy ? <span className="spinner" /> : 'Start my application'}
        </button>
        <button className="btn btn-outline" type="button" onClick={() => navigate('/applications')}>
          Go back
        </button>
      </div>
    </div>
  );
}
