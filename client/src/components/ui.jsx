import { statusInfo } from '../lib/labels';

export function Badge({ status, children, tone }) {
  if (children) return <span className={`badge badge-${tone || 'neutral'}`}>{children}</span>;
  const info = statusInfo(status);
  return <span className={`badge badge-${info.tone}`}>{info.label}</span>;
}

export function Loader({ label = 'Loading…', dark }) {
  return (
    <div className="page-loader">
      <div className={`spinner ${dark ? '' : 'spinner-dark'}`} />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p className="small">{text}</p>}
      {action && <div className="spacer-top">{action}</div>}
    </div>
  );
}

export function StatCard({ icon, tone = 'info', value, label }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <label className="label">{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
