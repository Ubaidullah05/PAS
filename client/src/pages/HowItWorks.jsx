import { Link } from 'react-router-dom';

const FLOW = [
  {
    icon: '📝',
    title: '1. Send your application',
    text: 'Answer a few simple questions about yourself, your address and your family. Upload a photo and your proofs, tick the declaration box and press send.',
    who: 'You do this'
  },
  {
    icon: '🔍',
    title: '2. We check your documents',
    text: 'A verification officer looks at every paper you uploaded. If something is missing or unclear, they send it back with a short note telling you exactly what to fix.',
    who: 'Verification officer'
  },
  {
    icon: '🧑‍✈️',
    title: '3. An officer reviews it',
    text: 'Once your documents are approved, a passport officer goes through your application, adds their remarks and approves it.',
    who: 'Passport officer'
  },
  {
    icon: '🛂',
    title: '4. Your passport is issued',
    text: 'The passport is printed with its number. You get a message, and you can collect it from the office you chose.',
    who: 'Passport officer'
  }
];

const STATUS_WORDS = [
  { tone: 'neutral', label: 'Not sent yet', text: 'You are still filling the form. Nothing has left your account.' },
  { tone: 'info', label: 'Waiting for documents check', text: 'We have your application. A verifier will pick it up next.' },
  { tone: 'info', label: 'Documents being checked', text: 'Someone is looking at your papers right now.' },
  { tone: 'success', label: 'Documents approved', text: 'Your papers are fine. It is now in the officer queue.' },
  { tone: 'info', label: 'Officer is reviewing', text: 'A passport officer is going through your application.' },
  { tone: 'success', label: 'Approved - printing', text: 'Good news! Your passport is being printed.' },
  { tone: 'success', label: 'Passport issued', text: 'Your passport is ready for you to collect.' },
  { tone: 'warning', label: 'More information needed', text: 'We need something from you. Open the application to see the note.' },
  { tone: 'danger', label: 'Rejected', text: 'Your application was not accepted. The reason is shown on the application page.' }
];

export default function HowItWorks() {
  return (
    <>
      <section className="hero" style={{ padding: '56px 0 110px' }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="eyebrow" style={{ color: '#7db2ff' }}>
            No jargon, we promise
          </div>
          <h1>
            How the passport
            <span>process actually works</span>
          </h1>
          <p className="hero-lead">
            Four steps, three people, one outcome. Here is exactly what happens after you press
            send — and what each word on your screen means.
          </p>
        </div>
      </section>

      <div className="container" style={{ marginTop: -70, position: 'relative', zIndex: 5 }}>
        <div className="grid-4">
          {FLOW.map((step) => (
            <div className="card card-pad stack" key={step.title}>
              <div className="service-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p className="small muted">{step.text}</p>
              <span className="badge badge-info">{step.who}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Word guide</div>
              <h2>What each status means</h2>
            </div>
            <p className="lead">
              Whenever your application moves forward, you will see one of these messages. Here is
              what each one means in everyday language.
            </p>
          </div>

          <div className="panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status on screen</th>
                    <th>What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_WORDS.map((row) => (
                    <tr key={row.label}>
                      <td style={{ width: 260 }}>
                        <span className={`badge badge-${row.tone}`}>{row.label}</span>
                      </td>
                      <td className="muted">{row.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cta spacer-top">
            <div>
              <h2 style={{ color: '#fff' }}>Ready to begin?</h2>
              <p className="lead" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Create an account and start the form. You can save it and come back whenever you
                like.
              </p>
            </div>
            <div className="row">
              <Link className="btn btn-primary" to="/register">
                Create account
              </Link>
              <Link className="btn btn-light" to="/help">
                What documents do I need?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
