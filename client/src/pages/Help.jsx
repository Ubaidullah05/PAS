import { useState } from 'react';
import { Link } from 'react-router-dom';

const DOCS = [
  { icon: '🖼️', title: 'Recent passport photo', text: 'A clear colour photo of your face, taken against a plain background. No sunglasses, no cap.' },
  { icon: '🪪', title: 'Identity proof', text: 'Aadhaar card, PAN card, Voter ID or driving licence — any one of these.' },
  { icon: '🏠', title: 'Address proof', text: 'Electricity bill, water bill, bank statement or rent agreement that shows where you live.' },
  { icon: '🎂', title: 'Date of birth proof', text: 'Birth certificate, school leaving certificate or the first page of your old passport.' },
  { icon: '🛂', title: 'Old passport', text: 'Only if you are renewing, or if your passport was lost or damaged.' },
  { icon: '✍️', title: 'Scanned signature', text: 'A clean scan of your signature on white paper. Keep it inside the box.' }
];

const FAQS = [
  {
    q: 'How long does the whole process take?',
    a: 'Once your documents are approved and an officer has reviewed the file, printing usually takes a couple of working days. You will get a message at every step.'
  },
  {
    q: 'What if I upload the wrong document?',
    a: 'No problem. Open the application, remove the file and upload the right one — as long as you have not sent the application yet. After sending it, the officer will send it back to you with a note.'
  },
  {
    q: 'Can I change my visit date?',
    a: 'Yes. Open the My visits page, cancel the existing visit and book a new time slot. The seat you gave up becomes free for somebody else.'
  },
  {
    q: 'Do I need to visit the office in person?',
    a: 'Most applications need one visit so your papers can be checked in person. Book a time slot so you do not have to wait in a queue.'
  },
  {
    q: 'My application went back to me. What now?',
    a: 'Open the application and read the note from the officer. Fix what they asked for, upload the paper again and continue from where you stopped.'
  },
  {
    q: 'Is my information safe?',
    a: 'Yes. Your details are stored securely, only the officers working on your file can see them, and every action they take is recorded.'
  }
];

export default function Help() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <section className="hero" style={{ padding: '56px 0 110px' }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="eyebrow" style={{ color: '#7db2ff' }}>
            Help centre
          </div>
          <h1>
            Documents and
            <span>answers, in plain words</span>
          </h1>
          <p className="hero-lead">
            Everything you need to prepare before you apply, plus the questions people ask us most
            often.
          </p>
        </div>
      </section>

      <div className="container" style={{ marginTop: -60, position: 'relative', zIndex: 5 }}>
        <div className="services-grid">
          {DOCS.map((doc) => (
            <div className="service-card" key={doc.title}>
              <div className="service-icon">{doc.icon}</div>
              <h3>{doc.title}</h3>
              <p>{doc.text}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="center" style={{ marginBottom: 26 }}>
            <div className="eyebrow">Good questions</div>
            <h2>Frequently asked questions</h2>
          </div>

          <div className="stack">
            {FAQS.map((item, index) => (
              <div className="panel" key={item.q}>
                <button
                  type="button"
                  className="panel-head"
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setOpen(open === index ? -1 : index)}
                >
                  <strong>{item.q}</strong>
                  <span>{open === index ? '−' : '+'}</span>
                </button>
                {open === index && <div className="panel-body muted">{item.a}</div>}
              </div>
            ))}
          </div>

          <div className="card card-pad spacer-top center">
            <h3>Still stuck?</h3>
            <p className="muted small">Call us on 1800-123-4567 or write to help@passportseva.gov.in.</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <Link className="btn btn-primary" to="/register">
                Start my application
              </Link>
              <Link className="btn btn-outline" to="/how-it-works">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
