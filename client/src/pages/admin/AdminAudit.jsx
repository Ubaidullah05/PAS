import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { EmptyState, Loader } from '../../components/ui';
import { formatDateTime } from '../../lib/labels';

const RESOURCES = [
  { value: '', label: 'Everything' },
  { value: 'application', label: 'Applications' },
  { value: 'user', label: 'People' },
  { value: 'office', label: 'Passport offices' },
  { value: 'appointment', label: 'Visits' },
  { value: 'slot', label: 'Time slots' },
  { value: 'document', label: 'Documents' }
];

export default function AdminAudit() {
  const { notify } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const query = resource ? `?resource=${resource}&limit=200` : '?limit=200';
    api
      .get(`/admin/audit${query}`)
      .then((res) => setLogs(res.data.logs))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  }, [resource, notify]);

  if (loading) return <Loader label="Reading the audit trail…" />;

  const filtered = logs.filter((log) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      log.action.toLowerCase().includes(needle) ||
      `${log.actor?.name || ''}`.toLowerCase().includes(needle) ||
      `${log.resourceName || ''}`.toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">Manage</div>
          <h2 style={{ fontSize: '1.4rem' }}>Audit trail</h2>
          <p className="muted small">
            Every important action in the system is recorded here with who did it and when. Nothing can
            be edited or deleted from this list.
          </p>
        </div>
        <div className="row">
          <input
            className="input"
            placeholder="Search action or person"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={resource} onChange={(e) => setResource(e.target.value)}>
            {RESOURCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>{filtered.length} record(s)</strong>
          <span className="tiny muted">Newest first</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="🧾" title="Nothing recorded yet" text="Actions taken in the system will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>About</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="muted">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.actor?.name || 'System'}
                      <div className="tiny muted">{log.actor?.role}</div>
                    </td>
                    <td>
                      <strong>{log.action}</strong>
                    </td>
                    <td className="muted">
                      {log.resourceName || log.resource}
                      {log.meta ? <div className="tiny">{JSON.stringify(log.meta)}</div> : null}
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
