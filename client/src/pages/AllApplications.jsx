import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader } from '../components/ui';
import { SERVICE_LABELS, statusInfo } from '../lib/labels';

const FILTERS = [
  { value: '', label: 'Everything' },
  { value: 'submitted', label: 'Waiting for check' },
  { value: 'verification_in_progress', label: 'Being checked' },
  { value: 'verified', label: 'Waiting for officer' },
  { value: 'approval_in_progress', label: 'With the officer' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued', label: 'Issued' },
  { value: 'on_hold', label: 'Sent back' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Still a draft' }
];

export default function AllApplications() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const query = status ? `?status=${status}` : '';
    api
      .get(`/applications/all${query}`)
      .then((res) => setItems(res.data.applications))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  }, [status, notify]);

  if (loading) return <Loader label="Loading all applications…" />;

  const filtered = items.filter((item) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.refNo.toLowerCase().includes(needle) ||
      `${item.applicant?.name || ''}`.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">Daily work</div>
          <h2 style={{ fontSize: '1.5rem' }}>Every application in the system</h2>
          <p className="muted small">
            Search by reference number or applicant name, or narrow it down by where it stands.
          </p>
        </div>
        <div className="row">
          <input
            className="input"
            style={{ minWidth: 220 }}
            placeholder="Search reference or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" style={{ width: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>{filtered.length} application(s)</strong>
          <span className="tiny muted">Click a row to open the file</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="🗂️" title="Nothing matches" text="Try a different search or clear the filter." />
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
                  <th>Updated</th>
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
                      <td className="muted">{item.updatedAt?.slice(0, 10)}</td>
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
