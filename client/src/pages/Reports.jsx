import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader, StatCard } from '../components/ui';
import { SERVICE_LABELS, statusInfo } from '../lib/labels';

function BarRow({ label, value, max, tone = 'var(--blue-600)' }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row-between tiny">
        <strong>{label}</strong>
        <span className="muted">{value}</span>
      </div>
      <div style={{ height: 9, background: 'var(--neutral-bg)', borderRadius: 999, marginTop: 6 }}>
        <div style={{ width: `${width}%`, height: '100%', background: tone, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function Reports() {
  const { notify } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/reports')
      .then((res) => setData(res.data))
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  }, [notify]);

  if (loading) return <Loader label="Preparing your reports…" />;
  if (!data) return <EmptyState icon="📊" title="Reports are unavailable right now" />;

  const maxStatus = Math.max(1, ...data.byStatus.map((row) => row.count));
  const maxOffice = Math.max(1, ...data.byOffice.map((row) => row.count));

  return (
    <>
      <div className="grid-4">
        <StatCard icon="👥" tone="info" value={data.totals.users} label="People registered" />
        <StatCard icon="🙋" tone="neutral" value={data.totals.applicants} label="Applicants" />
        <StatCard icon="📄" tone="warning" value={data.totals.applications} label="Applications" />
        <StatCard icon="🏢" tone="success" value={data.totals.offices} label="Open offices" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <strong>Where applications stand</strong>
            <span className="tiny muted">Counted across the whole system</span>
          </div>
          <div className="panel-body">
            {data.byStatus.length === 0 && <p className="muted small">No applications yet.</p>}
            {data.byStatus.map((row) => {
              const info = statusInfo(row._id);
              return <BarRow key={row._id} label={info.label} value={row.count} max={maxStatus} />;
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <strong>Busiest offices</strong>
            <span className="tiny muted">Top 10 by applications received</span>
          </div>
          <div className="panel-body">
            {data.byOffice.length === 0 && <p className="muted small">No office has received an application yet.</p>}
            {data.byOffice.slice(0, 10).map((row) => (
              <BarRow
                key={row._id}
                label={row.name ? `${row.name}${row.city ? ` — ${row.city}` : ''}` : 'Unknown office'}
                value={row.count}
                max={maxOffice}
                tone="var(--navy-700)"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>What people are applying for</strong>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type of application</th>
                <th>Number of files</th>
              </tr>
            </thead>
            <tbody>
              {data.byService.map((row) => (
                <tr key={row._id}>
                  <td>{SERVICE_LABELS[row._id] || row._id}</td>
                  <td>
                    <strong>{row.count}</strong>
                  </td>
                </tr>
              ))}
              {data.byService.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    Nothing to show yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
