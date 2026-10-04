import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { EmptyState, Loader, StatCard } from '../../components/ui';
import { formatDate } from '../../lib/labels';

const SINGLE = { office: '', date: '', time: '10:00', capacity: 10 };
const RANGE = { office: '', fromDate: '', toDate: '', times: ['10:00', '11:00', '14:00', '15:00'], capacity: 10 };

export default function AdminSlots() {
  const { notify, pushToast } = useApp();
  const [offices, setOffices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [single, setSingle] = useState(SINGLE);
  const [range, setRange] = useState(RANGE);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get('/appointments/slots/all')
      .then((res) => setSlots(res.data.slots))
      .catch((err) => notify(err));

  useEffect(() => {
    Promise.all([load(), api.get('/appointments/offices')])
      .then(([, officeRes]) => {
        const list = officeRes.data.offices;
        setOffices(list);
        if (list[0]) {
          setSingle((s) => ({ ...s, office: list[0]._id }));
          setRange((r) => ({ ...r, office: list[0]._id }));
        }
      })
      .catch((err) => notify(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSingle = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/appointments/slots', single);
      pushToast('success', 'Time slot opened', res.message);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const createRange = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/appointments/slots/range', range);
      pushToast('success', 'Time slots opened', res.message);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (slot) => {
    try {
      const res = await api.patch(`/appointments/slots/${slot._id}/toggle`);
      pushToast('info', 'Saved', res.message);
      await load();
    } catch (err) {
      notify(err);
    }
  };

  const toggleTime = (time) =>
    setRange((current) => ({
      ...current,
      times: current.times.includes(time)
        ? current.times.filter((t) => t !== time)
        : [...current.times, time]
    }));

  if (loading) return <Loader label="Loading visit time slots…" />;

  const upcoming = slots.filter((slot) => !slot.closed);
  const bookedSeats = slots.reduce((sum, slot) => sum + (slot.bookedCount || 0), 0);
  const freeSeats = slots.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount), 0);

  return (
    <>
      <div className="grid-3">
        <StatCard icon="🗓️" tone="info" value={upcoming.length} label="Open time slots" />
        <StatCard icon="💺" tone="success" value={freeSeats} label="Seats still free" />
        <StatCard icon="🎟️" tone="warning" value={bookedSeats} label="Seats already booked" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <form className="panel" onSubmit={createSingle}>
          <div className="panel-head">
            <strong>Open one time slot</strong>
          </div>
          <div className="panel-body stack">
            <div className="field">
              <label className="label">Passport office</label>
              <select
                className="select"
                value={single.office}
                onChange={(e) => setSingle({ ...single, office: e.target.value })}
              >
                <option value="">Choose an office</option>
                {offices.map((office) => (
                  <option key={office._id} value={office._id}>
                    {office.name} — {office.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={single.date}
                  onChange={(e) => setSingle({ ...single, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Start time</label>
                <input
                  className="input"
                  type="time"
                  required
                  value={single.time}
                  onChange={(e) => setSingle({ ...single, time: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">How many people?</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="200"
                  value={single.capacity}
                  onChange={(e) => setSingle({ ...single, capacity: Number(e.target.value) })}
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !single.office}>
              Open this slot
            </button>
          </div>
        </form>

        <form className="panel" onSubmit={createRange}>
          <div className="panel-head">
            <strong>Open a whole range of slots</strong>
            <span className="tiny muted">Handy for a new week or month</span>
          </div>
          <div className="panel-body stack">
            <div className="field">
              <label className="label">Passport office</label>
              <select
                className="select"
                value={range.office}
                onChange={(e) => setRange({ ...range, office: e.target.value })}
              >
                <option value="">Choose an office</option>
                {offices.map((office) => (
                  <option key={office._id} value={office._id}>
                    {office.name} — {office.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label">From</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={range.fromDate}
                  onChange={(e) => setRange({ ...range, fromDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">To</label>
                <input
                  className="input"
                  type="date"
                  required
                  value={range.toDate}
                  onChange={(e) => setRange({ ...range, toDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">People per slot</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="200"
                  value={range.capacity}
                  onChange={(e) => setRange({ ...range, capacity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Times to open every day</label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`slot ${range.times.includes(time) ? 'selected' : ''}`}
                    onClick={() => toggleTime(time)}
                  >
                    <div className="slot-time">{time}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={busy || !range.office || range.times.length === 0}
            >
              Open these slots
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Upcoming time slots</strong>
          <span className="tiny muted">Closing a slot hides it from applicants</span>
        </div>
        {slots.length === 0 ? (
          <EmptyState
            icon="⏰"
            title="No time slots yet"
            text="Use the forms above to open the first ones so applicants can book a visit."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Office</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id}>
                    <td>{formatDate(slot.date)}</td>
                    <td>
                      <strong>{slot.time}</strong>
                    </td>
                    <td className="muted">{slot.office?.name || '—'}</td>
                    <td>
                      {slot.bookedCount} / {slot.capacity} booked
                    </td>
                    <td>
                      <span className={`badge badge-${slot.closed ? 'neutral' : 'success'}`}>
                        {slot.closed ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => toggle(slot)}>
                        {slot.closed ? 'Re-open' : 'Close'}
                      </button>
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
