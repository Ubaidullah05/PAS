import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { EmptyState, Loader, StatCard } from '../../components/ui';
import { formatDateTime, statusInfo } from '../../lib/labels';

export default function AdminHome() {
  const { notify, user } = useApp();
  const [reports, setReports] = useState(null);
  const [logs, setLogs] = useState(null);
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/reports'),
      api.get('/admin/audit?limit=6').catch(() => ({ data: { data: { logs: [] } } })),
      api.get('/appointments/slots/all').catch(() => ({ data: { data: { slots: [] } } }))
    ])
      .then(([reportRes, auditRes, slotRes]) => {
        setReports(reportRes.data);
        setLogs(auditRes.data.data.logs);
        setSlots(slotRes.data.data.slots);
      })
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
  }, [notify]);

  if (loading) return <Loader label="Loading your control room…" />;
  if (!reports) return <EmptyState icon="⚠️" title="We could not load the control room" text="Please refresh the page." />;

  const stats = reports.byStatus.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">Control room</div>
          <h2 style={{ fontSize: '1.5rem' }}>Good to see you, {user.name.split(' ')[0]}</h2>
          <p className="muted small">Here is how the passport system is doing right now.</p>
        </div>
        <div className="row">
          <Link className="btn btn-primary" to="/admin/users">
            Add a person
          </Link>
          <Link className="btn btn-outline" to="/reports">
            Open reports
          </Link>
        </div>
      </div>

      <div className="grid-4">
        <StatCard icon="📄" tone="info" value={reports.totals.applications} label="Applications received" />
        <StatCard icon="🕐" tone="warning" value={(stats.submitted || 0) + (stats.verified || 0)} label="Waiting on our team" />
        <StatCard icon="✅" tone="success" value={(stats.approved || 0) + (stats.issued || 0)} label="Approved or issued" />
        <StatCard icon="👥" tone="neutral" value={reports.totals.users} label="People with an account" />
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <strong>Quick actions</strong>
          </div>
          <div className="panel-body stack" style={{ gap: 10 }}>
            <Link className="btn btn-outline" to="/admin/users">
              👥 Manage people and roles
            </Link>
            <Link className="btn btn-outline" to="/admin/offices">
              🏢 Passport offices
            </Link>
            <Link className="btn btn-outline" to="/admin/slots">
              ⏰ Open visit time slots
            </Link>
            <Link className="btn btn-outline" to="/admin/audit">
              🧾 Who did what (audit trail)
            </Link>
            <Link className="btn btn-outline" to="/console/applications">
              🗂️ Every application
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <strong>Where applications stand</strong>
          </div>
          <div className="panel-body">
            {reports.byStatus.map((row) => {
              const info = statusInfo(row._id);
              return (
                <div className="row-between" key={row._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="small">
                    {info.icon} {info.label}
                  </span>
                  <strong>{row.count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <strong>Next visit slots</strong>
            <Link className="tiny" to="/admin/slots">
              Manage
            </Link>
          </div>
          <div className="panel-body">
            {slots.length === 0 && <p className="muted small">No time slots are open yet.</p>}
            {slots.slice(0, 6).map((slot) => (
              <div className="row-between" key={slot._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="small">
                  {slot.date} · {slot.time}
                  <span className="tiny muted"> — {slot.office?.name}</span>
                </span>
                <span className={`badge badge-${slot.closed ? 'neutral' : 'success'}`}>
                  {slot.closed ? 'Closed' : `${Math.max(0, slot.capacity - slot.bookedCount)} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Latest activity</strong>
          <Link className="tiny" to="/admin/audit">
            See the full audit trail
          </Link>
        </div>
        {logs.length === 0 ? (
          <EmptyState icon="🧾" title="Nothing recorded yet" text="Every action in the system will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What happened</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="muted">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.actor?.name || 'System'}
                      <div className="tiny muted">{log.actor?.email}</div>
                    </td>
                    <td>
                      <strong>{log.action}</strong>
                      <div className="tiny muted">{log.resourceName || log.resource}</div>
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
