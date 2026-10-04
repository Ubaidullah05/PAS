import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader, StatCard } from '../components/ui';
import { SERVICE_LABELS, formatDate, statusInfo } from '../lib/labels';

const CARD_ICONS = ['📄', '📝', '⏳', '🛂'];

export default function Dashboard() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get('/dashboard/overview')
      .then((res) => alive && setData(res.data))
      .catch((err) => notify(err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [notify]);

  if (loading) return <Loader label="Opening your dashboard…" />;
  if (!data) return <EmptyState icon="⚠️" title="We could not load your dashboard" />;

  return (
    <>
      <div className="card card-pad row-between">
        <div>
          <div className="eyebrow">{data.isStaff ? 'Work waiting for you' : 'Hello again'}</div>
          <h2 style={{ fontSize: '1.5rem' }}>
            {data.isStaff ? `${data.roleLabel} control room` : `Welcome, ${user.name.split(' ')[0]}`}
          </h2>
          <p className="muted small">
            {data.isStaff
              ? 'Everything below is counted across the whole system, so you know exactly what needs attention.'
              : 'Here is a quick look at where your passport applications stand right now.'}
          </p>
        </div>
        {!data.isStaff && (
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={() => navigate('/applications/new')}>
              Start a new application
            </button>
            <button className="btn btn-outline" type="button" onClick={() => navigate('/appointments')}>
              Book a visit
            </button>
          </div>
        )}
      </div>

      <div className="grid-4">
        {data.cards.map((card, index) => (
          <StatCard
            key={card.label}
            icon={CARD_ICONS[index] || '📊'}
            tone={card.tone}
            value={card.value}
            label={card.label}
          />
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <strong>{data.isStaff ? 'Applications that changed recently' : 'Your recent applications'}</strong>
            <Link className="service-link" to={data.isStaff ? '/console/applications' : '/applications'}>
              See all →
            </Link>
          </div>

          {data.applications.length === 0 ? (
            <EmptyState
              icon="📭"
              title={data.isStaff ? 'No applications yet' : 'You have not applied yet'}
              text={
                data.isStaff
                  ? 'New applications will appear here the moment somebody sends one.'
                  : 'Applying takes about ten minutes. You can save and come back later.'
              }
              action={
                !data.isStaff && (
                  <button className="btn btn-primary" type="button" onClick={() => navigate('/applications/new')}>
                    Start my application
                  </button>
                )
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Where it stands</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications.map((app) => {
                    const info = statusInfo(app.status);
                    return (
                      <tr
                        key={app._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/applications/${app._id}`)}
                      >
                        <td>
                          <strong>{app.refNo}</strong>
                        </td>
                        <td>{SERVICE_LABELS[app.serviceType] || app.serviceType}</td>
                        <td>
                          <span className={`badge badge-${info.tone}`}>{info.label}</span>
                        </td>
                        <td className="muted">{formatDate(app.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <strong>Upcoming visits</strong>
            <Link className="service-link" to="/appointments">
              Manage →
            </Link>
          </div>

          {data.appointments.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No visit booked"
              text="Book a time slot so you can hand in or collect your documents without waiting in a queue."
              action={
                <button className="btn btn-outline" type="button" onClick={() => navigate('/appointments')}>
                  See available times
                </button>
              }
            />
          ) : (
            <div className="panel-body stack">
              {data.appointments.map((visit) => (
                <div className="card card-pad" key={visit._id} style={{ background: '#f9fbff' }}>
                  <div className="row-between">
                    <strong>{visit.office?.name}</strong>
                    <span className="badge badge-info">{visit.status}</span>
                  </div>
                  <p className="small muted">
                    {formatDate(visit.date)} at {visit.time} · {visit.office?.city}
                  </p>
                  <p className="tiny muted">Reference: {visit.refNo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
