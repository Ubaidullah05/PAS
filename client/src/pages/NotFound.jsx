import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-wrap" style={{ minHeight: '100vh' }}>
      <div className="auth-main" style={{ gridColumn: '1 / -1' }}>
        <div className="auth-card stack center">
          <div style={{ fontSize: '3rem' }}>🧭</div>
          <h2>This page took a wrong turn</h2>
          <p className="muted">
            The link you followed does not exist. Let us take you back to somewhere useful.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/">
              Go to home
            </Link>
            <Link className="btn btn-outline" to="/help">
              Visit help centre
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
