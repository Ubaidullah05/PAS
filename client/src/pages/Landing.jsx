import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'apply', label: 'Apply', icon: '📝' },
  { id: 'track', label: 'Track', icon: '📍' },
  { id: 'visit', label: 'Book a visit', icon: '📅' },
  { id: 'docs', label: 'What documents', icon: '📎' }
];

const TRUST = [
  { icon: '🛡️', title: 'Safe and private', text: 'Your details are locked away and never shared.' },
  { icon: '🏷️', title: 'Clear, fixed fees', text: 'No surprises. You always see what you pay.' },
  { icon: '⚡', title: 'Quick and simple', text: 'Fill the form once and track it any time.' },
  { icon: '🕐', title: 'We are here to help', text: 'Support on every working day, 9:30 am to 6 pm.' }
];

const SERVICES = [
  {
    icon: '🛂',
    title: 'Apply for a passport',
    text: 'Fill one simple form, upload your papers and send it. That is all it takes to get started.',
    link: '/register',
    cta: 'Start now'
  },
  {
    icon: '🔍',
    title: 'Documents check',
    text: 'Our team checks your papers carefully and tells you exactly what is missing, if anything.',
    link: '/how-it-works',
    cta: 'See the steps'
  },
  {
    icon: '📅',
    title: 'Book a visit',
    text: 'Pick an office, a date and a time that suits you. Change it later if plans change.',
    link: '/appointments',
    cta: 'View visits'
  },
  {
    icon: '📍',
    title: 'Track your application',
    text: 'See where your application is right now, in words you do not need a dictionary for.',
    link: '/track',
    cta: 'Track now'
  },
  {
    icon: '📄',
    title: 'Renew or reissue',
    text: 'Old passport expired, lost or damaged? Choose the right option and we guide you through it.',
    link: '/register',
    cta: 'Get started'
  },
  {
    icon: '💬',
    title: 'Help and answers',
    text: 'Stuck somewhere? Find plain answers to the questions people ask us most often.',
    link: '/help',
    cta: 'Visit help'
  }
];

const STEPS = [
  { title: 'Create your account', text: 'Just your name, email and a password. Takes under a minute.' },
  { title: 'Fill the form', text: 'Answer each question in plain language. Save it and come back later.' },
  { title: 'Upload and send', text: 'Add your photo and proofs, then send the application.' },
  { title: 'Visit and collect', text: 'We check your papers, the officer approves it and your passport is issued.' }
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [tab, setTab] = useState('apply');
  const [refNo, setRefNo] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  const run = (event) => {
    event.preventDefault();
    if (tab === 'track') return navigate(refNo ? '/login' : '/login');
    if (tab === 'visit') return navigate('/appointments');
    if (tab === 'docs') return navigate('/help');
    return navigate(user ? '/applications/new' : '/register');
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow" style={{ color: '#7db2ff' }}>
              Apply · Upload · Track · Collect
            </div>
            <h1>
              Your Passport
              <span>Made Simple</span>
            </h1>
            <p className="hero-lead">
              Apply for your passport, upload your documents, book a visit and see exactly where your
              application stands — all in one place, all explained in plain words.
            </p>

            <div className="hero-pills">
              <span className="pill">
                <span className="pill-icon">🛡️</span> Safe &amp; private
              </span>
              <span className="pill">
                <span className="pill-icon">🏷️</span> Clear fees
              </span>
              <span className="pill">
                <span className="pill-icon">⚡</span> Easy &amp; fast
              </span>
              <span className="pill">
                <span className="pill-icon">🕐</span> Help when you need it
              </span>
            </div>
          </div>

          <div className="hero-art">
            <span className="plane">✈️</span>
            <span className="globe">🌏</span>
            <div className="hero-art-caption">
              <strong>Travel. Explore. Repeat.</strong>
              <p className="small" style={{ color: 'rgba(255,255,255,0.82)' }}>
                Everything you need before you fly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="search-card">
          <div className="search-tabs">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`search-tab ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>

          <form className="search-grid" onSubmit={run}>
            {tab === 'track' && (
              <div className="search-cell" style={{ gridColumn: 'span 2' }}>
                <label className="label">Application number</label>
                <input
                  className="input"
                  placeholder="For example: PAS-2026-000123"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>
            )}

            {tab === 'visit' && (
              <>
                <div className="search-cell">
                  <label className="label">Nearby city</label>
                  <input
                    className="input"
                    placeholder="Enter your city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="search-cell">
                  <label className="label">Preferred date</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {tab === 'apply' && (
              <>
                <div className="search-cell">
                  <label className="label">What do you need?</label>
                  <select className="select" defaultValue="fresh">
                    <option value="fresh">New passport</option>
                    <option value="renewal">Renew my passport</option>
                    <option value="lost">Lost passport</option>
                    <option value="damaged">Damaged passport</option>
                  </select>
                </div>
                <div className="search-cell">
                  <label className="label">How soon do you need it?</label>
                  <select className="select" defaultValue="normal">
                    <option value="normal">Normal processing</option>
                    <option value="tatkal">Urgent (Tatkal)</option>
                  </select>
                </div>
              </>
            )}

            {tab === 'docs' && (
              <div className="search-cell" style={{ gridColumn: 'span 2' }}>
                <label className="label">What are you looking for?</label>
                <select className="select" defaultValue="list">
                  <option value="list">List of documents I need</option>
                  <option value="photo">Photo and signature rules</option>
                  <option value="address">Proof of address</option>
                </select>
              </div>
            )}

            <button className="btn btn-primary" type="submit">
              {tab === 'track' ? 'Find it' : tab === 'visit' ? 'Search' : tab === 'docs' ? 'Show me' : 'Start apply'}
            </button>
          </form>
        </div>

        <div className="trust-row">
          {TRUST.map((item) => (
            <div className="trust-item" key={item.title}>
              <div className="trust-icon">{item.icon}</div>
              <div>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">What we do</div>
              <h2>
                Everything you need
                <br />
                for a smoother journey
              </h2>
            </div>
            <div>
              <p className="lead">
                Passport Seva brings the whole process together — from the first form to the day your
                passport is handed to you. No queues, no confusion, no guesswork.
              </p>
              <button className="btn btn-navy spacer-top" type="button" onClick={() => navigate('/how-it-works')}>
                Learn more →
              </button>
            </div>
          </div>

          <div className="services-grid">
            {SERVICES.map((service) => (
              <article className="service-card" key={service.title}>
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <button
                  type="button"
                  className="service-link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  onClick={() => navigate(service.link)}
                >
                  {service.cta} →
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 34 }}>
            <div className="eyebrow">How it works</div>
            <h2>Four small steps. That is it.</h2>
          </div>
          <div className="steps">
            {STEPS.map((step) => (
              <div className="step" key={step.title}>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta">
            <div>
              <div className="eyebrow" style={{ color: '#7db2ff' }}>
                Ready when you are
              </div>
              <h2 style={{ color: '#fff' }}>Start your application today</h2>
              <p className="lead" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Create a free account and finish the form at your own pace. You can save your
                progress and come back any time.
              </p>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => navigate(user ? '/applications/new' : '/register')}
              >
                {user ? 'Apply now' : 'Create free account'}
              </button>
              <button className="btn btn-light" type="button" onClick={() => navigate('/track')}>
                Track application
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
