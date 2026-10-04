import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader } from '../components/ui';
import { SERVICE_LABELS, formatDate, statusInfo } from '../lib/labels';

export default function Queue({ queue }) {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get(`/applications/queue?queue=${queue}`)
      .then((res) => setItems(res.data.applications))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  }, [queue, notify]);

  if (loading) return <Loader label="Loading your work list…" />;

  const filtered = items.filter((item) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.refNo.toLowerCase().includes(needle) ||
      `${item.applicant?.name || ''}`.toLowerCase().includes(needle)
    );
  });

  const isVerification = queue === 'verification';

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">Daily work</div>
          <h2 style={{ fontSize: '1.5rem' }}>
            {isVerification ? 'Applications waiting for a documents check' : 'Applications waiting for your approval'}
          </h2>
          <p className="muted small">
            {isVerification
              ? 'Open an application, look at each uploaded paper and accept it or send it back with a note.'
              : 'Read through the file, add your remark and approve or reject it. Issuing creates the passport number.'}
          </p>
        </div>
        <div className="field" style={{ minWidth: 240 }}>
          <label className="label">Search by reference or name</label>
          <input
            className="input"
            placeholder="For example: PAS-2026 or Sharma"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-icon tone-info">📥</div>
          <div>
            <div className="stat-value">{items.length}</div>
            <div className="stat-label">Waiting in this list</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon tone-warning">⏳</div>
          <div>
            <div className="stat-value">{items.filter((i) => i.status === 'on_hold').length}</div>
            <div className="stat-label">Sent back for more info</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon tone-success">🆕</div>
          <div>
            <div className="stat-value">
              {items.filter((i) => (Date.now() - new Date(i.createdAt)) / 86400000 < 2).length}
            </div>
            <div className="stat-label">Arrived in the last 2 days</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>{isVerification ? 'Documents check list' : 'Approval list'}</strong>
          <span className="tiny muted">Click a row to open the full file</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="Nothing waiting"
            text="Every application in this list has been dealt with. New ones will show up here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Office</th>
                  <th>Where it stands</th>
                  <th>Sent on</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const info = statusInfo(item.status);
                  return (
                    <tr key={item._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/applications/${item._id}`)}>
                      <td>
                        <strong>{item.refNo}</strong>
                      </td>
                      <td>
                        {item.applicant?.name}
                        <div className="tiny muted">{item.applicant?.email}</div>
                      </td>
                      <td className="muted">{SERVICE_LABELS[item.serviceType]}</td>
                      <td className="muted">{item.office?.name || '—'}</td>
                      <td>
                        <span className={`badge badge-${info.tone}`}>{info.label}</span>
                      </td>
                      <td className="muted">{formatDate(item.submittedAt || item.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/applications/${item._id}`);
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
