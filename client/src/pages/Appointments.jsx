import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { EmptyState, Loader } from '../components/ui';
import { PURPOSE_LABELS, formatDate } from '../lib/labels';

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function nextDays(count) {
  const days = [];
  const start = new Date();
  for (let i = 1; i <= count; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({ iso: toISO(date), label: date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) });
  }
  return days;
}

export default function Appointments() {
  const { notify, pushToast } = useApp();
  const [mine, setMine] = useState([]);
  const [offices, setOffices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [office, setOffice] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [days] = useState(() => nextDays(14));
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadMine = () =>
    api
      .get('/appointments/mine')
      .then((res) => setMine(res.data.appointments))
      .catch((err) => notify(err));

  useEffect(() => {
    Promise.all([api.get('/appointments/offices'), api.get('/applications/mine'), loadMine()])
      .then(([officeRes, appRes]) => {
        setOffices(officeRes.data.offices);
        if (officeRes.data.offices[0]) setOffice(officeRes.data.offices[0]._id);
        setApplications(appRes.data.applications);
        if (appRes.data.applications[0]) setApplicationId(appRes.data.applications[0]._id);
      })
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!office || !date) return setSlots([]);
    api
      .get(`/appointments/slots?office=${office}&date=${date}`)
      .then((res) => setSlots(res.data.slots))
      .catch((err) => {
        setSlots([]);
        notify(err);
      });
  }, [office, date, notify]);

  const openDays = useMemo(() => days, [days]);
  const activeBookings = mine.filter((visit) => visit.status === 'booked');
  const pastBookings = mine.filter((visit) => visit.status !== 'booked');

  const book = async () => {
    if (!slotId) return pushToast('warning', 'Pick a time', 'Please choose a time slot first.');
    if (!applicationId) return pushToast('warning', 'Choose an application', 'Pick the application this visit is for.');
    setBusy(true);
    try {
      const res = await api.post('/appointments/book', { applicationId, slotId, purpose: 'verification' });
      pushToast('success', 'Visit confirmed', res.message);
      setSlotId('');
      await loadMine();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this visit? The time slot will be offered to somebody else.')) return;
    try {
      const res = await api.post(`/appointments/${id}/cancel`, { reason: 'Cancelled by applicant' });
      pushToast('info', 'Visit cancelled', res.message);
      await loadMine();
    } catch (err) {
      notify(err);
    }
  };

  if (loading) return <Loader label="Loading your visits…" />;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <strong>Book a visit</strong>
          <span className="tiny muted">Pick an office, a day and a time that suits you</span>
        </div>
        <div className="panel-body stack">
          <div className="form-grid">
            <div className="field">
              <label className="label">Passport office</label>
              <select className="select" value={office} onChange={(e) => setOffice(e.target.value)}>
                <option value="">Choose an office</option>
                {offices.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} — {item.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Which application is this for?</label>
              <select className="select" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">Choose an application</option>
                {applications.map((app) => (
                  <option key={app._id} value={app._id}>
                    {app.refNo} — {app.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label">Choose a day</label>
            <div className="slot-grid">
              {openDays.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  className={`slot ${date === day.iso ? 'selected' : ''}`}
                  onClick={() => {
                    setDate(day.iso);
                    setSlotId('');
                  }}
                >
                  <div className="slot-time" style={{ fontSize: '0.95rem' }}>
                    {day.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Choose a time</label>
            {!date && <p className="muted small">Pick a day first to see the free times.</p>}
            {date && slots.length === 0 && (
              <EmptyState icon="🗓️" title="No free times on this day" text="Try another day, or ask the office to open more slots." />
            )}
            {slots.length > 0 && (
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot._id}
                    type="button"
                    className={`slot ${slotId === slot._id ? 'selected' : ''}`}
                    disabled={slot.seatsLeft <= 0}
                    onClick={() => setSlotId(slot._id)}
                  >
                    <div className="slot-time">{slot.time}</div>
                    <div className="slot-left">
                      {slot.seatsLeft > 0 ? `${slot.seatsLeft} seats left` : 'Fully booked'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="row">
            <button className="btn btn-primary" type="button" onClick={book} disabled={busy || !slotId}>
              {busy ? <span className="spinner" /> : 'Confirm my visit'}
            </button>
            <span className="tiny muted">Please arrive 15 minutes early with your original papers.</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Your visits</strong>
          <span className="tiny muted">{activeBookings.length} upcoming</span>
        </div>

        {mine.length === 0 ? (
          <EmptyState icon="📅" title="No visits booked yet" text="Use the form above to pick a time." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Office</th>
                  <th>When</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mine.map((visit) => (
                  <tr key={visit._id}>
                    <td>
                      <strong>{visit.refNo}</strong>
                    </td>
                    <td>
                      {visit.office?.name}
                      <div className="tiny muted">{visit.office?.city}</div>
                    </td>
                    <td>
                      {formatDate(visit.date)} · {visit.time}
                    </td>
                    <td className="muted">{PURPOSE_LABELS[visit.purpose] || visit.purpose}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          visit.status === 'booked'
                            ? 'info'
                            : visit.status === 'cancelled'
                              ? 'neutral'
                              : visit.status === 'completed'
                                ? 'success'
                                : 'warning'
                        }`}
                      >
                        {visit.status}
                      </span>
                    </td>
                    <td>
                      {visit.status === 'booked' && (
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => cancel(visit._id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pastBookings.length > 0 && (
        <p className="tiny muted">
          {pastBookings.length} earlier visit(s) are kept in your history for reference.
        </p>
      )}
    </>
  );
}
