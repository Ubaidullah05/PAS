import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ color: '#fff' }}>
              <span className="brand-mark">🛂</span>
              <span>
                Passport Seva
                <span className="brand-sub">Apply · Track · Collect</span>
              </span>
            </div>
            <p className="small" style={{ marginTop: 14, maxWidth: '38ch' }}>
              One simple place to apply for your passport, upload your papers, book a visit and see
              exactly where your application stands.
            </p>
          </div>

          <div>
            <h4>For applicants</h4>
            <Link to="/register">Create an account</Link>
            <Link to="/applications/new">Apply for a passport</Link>
            <Link to="/track">Track your application</Link>
            <Link to="/appointments">Book a visit</Link>
          </div>

          <div>
            <h4>Guidance</h4>
            <Link to="/how-it-works">How the process works</Link>
            <Link to="/help">Documents you need</Link>
            <Link to="/help">Frequently asked questions</Link>
            <Link to="/help">Contact the office</Link>
          </div>

          <div>
            <h4>Office</h4>
            <a href="tel:18001234567">Helpline: 1800-123-4567</a>
            <a href="mailto:help@passportseva.gov.in">help@passportseva.gov.in</a>
            <p className="small" style={{ marginTop: 8 }}>
              Monday to Friday, 9:30 am to 6:00 pm
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Passport Seva. Built for demonstration purposes.</span>
          <span>Your information is kept private and protected.</span>
        </div>
      </div>
    </footer>
  );
}
