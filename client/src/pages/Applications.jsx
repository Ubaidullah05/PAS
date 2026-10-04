import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader } from '../components/ui';
import { SERVICE_LABELS, formatDate, statusInfo } from '../lib/labels';

export default function Applications() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .get('/applications/mine')
      .then((res) => setItems(res.data.applications))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = async () => {
    try {
      const res = await api.post('/applications', {});
      navigate(`/applications/${res.data.application._id}?edit=1`);
    } catch (err) {
      notify(err);
    }
  };

  if (loading) return <Loader label="Loading your applications…" />;

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">My passport</div>
          <h2 style={{ fontSize: '1.5rem' }}>Your applications</h2>
          <p className="muted small">
            Every application you have started, and exactly where each one stands.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={startNew}>
          + New application
        </button>
      </div>

      {items.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="🛂"
            title="No applications yet"
            text="When you start one, it will show up here with its reference number and status."
            action={
              <button className="btn btn-primary" type="button" onClick={startNew}>
                Start my first application
              </button>
            }
          />
        </div>
      ) : (
        <div className="stack">
          {items.map((app) => {
            const info = statusInfo(app.status);
            return (
              <div className="card card-pad card-hover" key={app._id}>
                <div className="row-between">
                  <div>
                    <div className="row" style={{ gap: 10 }}>
                      <strong style={{ fontSize: '1.05rem' }}>{app.refNo}</strong>
                      <span className={`badge badge-${info.tone}`}>{info.label}</span>
                    </div>
                    <p className="small muted">
                      {SERVICE_LABELS[app.serviceType]} · {app.category === 'tatkal' ? 'Urgent' : 'Normal'} ·
                      Started {formatDate(app.createdAt)}
                    </p>
                    <p className="tiny muted">
                      Office: {app.office ? `${app.office.name}, ${app.office.city}` : 'Not chosen yet'}
                    </p>
                  </div>
                  <div className="row">
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => navigate(`/applications/${app._id}`)}
                    >
                      {app.status === 'draft' ? 'Continue' : 'Track'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
