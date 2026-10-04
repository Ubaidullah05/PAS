import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api, { fetchFile } from '../lib/api';
import { EmptyState, Loader } from '../components/ui';
import {
  DOCUMENT_LABEL,
  DOCUMENT_TYPES,
  SERVICE_LABELS,
  can,
  formatBytes,
  formatDate,
  formatDateTime,
  milestonesFor,
  statusInfo
} from '../lib/labels';

const EMPTY_FORM = {
  serviceType: 'fresh',
  category: 'normal',
  personal: { firstName: '', lastName: '', dob: '', gender: '', maritalStatus: 'single', placeOfBirth: '' },
  contact: { email: '', phone: '', addressLine: '', city: '', state: '', pincode: '' },
  family: { fatherName: '', motherName: '', spouseName: '' },
  previousPassport: { number: '', issueDate: '', expiryDate: '' },
  declarations: { criminalCase: false, passportDenied: false, citizenshipOther: false, agreesToTerms: false },
  office: ''
};

export default function ApplicationDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, notify, pushToast } = useApp();

  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('photo');
  const [file, setFile] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRemark, setReviewRemark] = useState('');

  const load = async () => {
    try {
      const [detail, officesRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get('/appointments/offices').catch(() => ({ data: { offices: [] } }))
      ]);
      setApplication(detail.data.application);
      setDocuments(detail.data.documents || []);
      setMilestones(detail.data.milestones || []);
      setOffices(officesRes.data.offices);
      setForm({
        serviceType: detail.data.application.serviceType || 'fresh',
        category: detail.data.application.category || 'normal',
        personal: { ...EMPTY_FORM.personal, ...(detail.data.application.personal || {}) },
        contact: { ...EMPTY_FORM.contact, ...(detail.data.application.contact || {}) },
        family: { ...EMPTY_FORM.family, ...(detail.data.application.family || {}) },
        previousPassport: { ...EMPTY_FORM.previousPassport, ...(detail.data.application.previousPassport || {}) },
        declarations: { ...EMPTY_FORM.declarations, ...(detail.data.application.declarations || {}) },
        office: detail.data.application.office?._id || detail.data.application.office || ''
      });
      if (detail.data.application.status !== 'draft') setEditing(false);
    } catch (err) {
      notify(err);
      navigate('/applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOwner = useMemo(
    () => application && String(application.applicant?._id || application.applicant) === String(user._id),
    [application, user]
  );

  if (loading) return <Loader label="Opening your application…" />;
  if (!application) return <EmptyState icon="⚠️" title="We could not find that application" />;

  const info = statusInfo(application.status);
  const isDraft = application.status === 'draft';
  const canEdit = isOwner && isDraft;
  const history = application.statusHistory || [];

  const setField = (section, key, value) => {
    if (section) setForm({ ...form, [section]: { ...form[section], [key]: value } });
    else setForm({ ...form, [key]: value });
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.patch(`/applications/${id}`, form);
      setApplication(res.data.application);
      pushToast('success', 'Saved', 'Your changes were saved. You can come back any time.');
      setEditing(false);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/applications/${id}/submit`, {});
      setApplication(res.data.application);
      pushToast('success', 'Application sent', res.message);
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      await api.delete(`/applications/${id}`);
      pushToast('info', 'Draft removed', 'Your draft application was deleted.');
      navigate('/applications');
    } catch (err) {
      notify(err);
    }
  };

  const move = async (action) => {
    if (['reject', 'sendBack'].includes(action) && !remark.trim()) {
      pushToast('warning', 'A short note is needed', 'Please write a reason so the applicant knows what to do.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/applications/${id}/move`, { action, remark });
      pushToast('success', 'Done', res.message);
      setRemark('');
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!file) return pushToast('warning', 'Choose a file', 'Please pick a file from your device first.');
    const data = new FormData();
    data.append('type', docType);
    data.append('file', file);
    setUploading(true);
    try {
      const res = await api.upload(`/applications/${id}/documents`, data);
      pushToast('success', 'Uploaded', `${DOCUMENT_LABEL[res.data.document.type]} was added.`);
      setFile(null);
      event.target.reset();
      await load();
    } catch (err) {
      notify(err);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (docId) => {
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments((list) => list.filter((d) => d._id !== docId));
      pushToast('info', 'Removed', 'The document was removed.');
    } catch (err) {
      notify(err);
    }
  };

  const openDocument = async (docId) => {
    try {
      const blob = await fetchFile(`/documents/${docId}/file`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      notify(err);
    }
  };

  const reviewDocument = async (docId, reviewStatus) => {
    if (reviewStatus === 'rejected' && !reviewRemark.trim()) {
      pushToast('warning', 'A short note is needed', 'Tell the applicant why this document was not accepted.');
      return;
    }
    try {
      await api.patch(`/documents/${docId}/review`, { reviewStatus, remark: reviewRemark });
      pushToast('success', 'Saved', `Document marked as ${reviewStatus}.`);
      setReviewTarget(null);
      setReviewRemark('');
      await load();
    } catch (err) {
      notify(err);
    }
  };

  const staff = can(user, 'application:read:any');
  const canVerify = can(user, 'application:verify');
  const canApprove = can(user, 'application:approve');
  const canIssue = can(user, 'application:issue');

  const actions = [];
  if (staff) {
    if (application.status === 'submitted' && canVerify) actions.push({ action: 'startVerification', label: 'Start checking documents', tone: 'btn-primary' });
    if (application.status === 'verification_in_progress' && canVerify) {
      actions.push({ action: 'approveDocuments', label: 'Documents look good', tone: 'btn-success' });
      actions.push({ action: 'sendBack', label: 'Send back for changes', tone: 'btn-outline' });
      actions.push({ action: 'reject', label: 'Reject', tone: 'btn-danger' });
    }
    if (application.status === 'on_hold' && application.holdReturnTo === 'verification_in_progress' && canVerify) {
      actions.push({ action: 'resumeVerification', label: 'Resume the check', tone: 'btn-primary' });
    }
    if (application.status === 'verified' && canApprove) actions.push({ action: 'startApproval', label: 'Start officer review', tone: 'btn-primary' });
    if (application.status === 'approval_in_progress' && canApprove) {
      actions.push({ action: 'approve', label: 'Approve application', tone: 'btn-success' });
      actions.push({ action: 'sendBack', label: 'Send back for changes', tone: 'btn-outline' });
      actions.push({ action: 'reject', label: 'Reject', tone: 'btn-danger' });
    }
    if (application.status === 'on_hold' && application.holdReturnTo === 'approval_in_progress' && canApprove) {
      actions.push({ action: 'resumeApproval', label: 'Resume officer review', tone: 'btn-primary' });
    }
    if (application.status === 'approved' && canIssue) actions.push({ action: 'issue', label: 'Issue passport', tone: 'btn-primary' });
  }

  const milestoneList = milestones.length ? milestones : milestonesFor(application);

  return (
    <>
      <div className="card card-pad">
        <div className="row-between">
          <div>
            <div className="eyebrow">{SERVICE_LABELS[application.serviceType]}</div>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.5rem' }}>{application.refNo}</h2>
              <span className={`badge badge-${info.tone}`}>{info.label}</span>
              <span className="badge badge-neutral">{application.category === 'tatkal' ? 'Urgent' : 'Normal'}</span>
            </div>
            <p className="muted small">
              Started {formatDate(application.createdAt)}
              {application.submittedAt && ` · Sent ${formatDate(application.submittedAt)}`}
              {application.office ? ` · ${application.office.name}` : ''}
            </p>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            {canEdit && !editing && (
              <button className="btn btn-outline" type="button" onClick={() => setEditing(true)}>
                Edit details
              </button>
            )}
            {canEdit && editing && (
              <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
                {busy ? <span className="spinner" /> : 'Save changes'}
              </button>
            )}
            {canEdit && (
              <button className="btn btn-primary" type="button" onClick={submit} disabled={busy}>
                Send application
              </button>
            )}
            {canEdit && (
              <button className="btn btn-outline" type="button" onClick={remove}>
                Delete draft
              </button>
            )}
          </div>
        </div>

        {application.status === 'on_hold' && (
          <div className="alert alert-warning spacer-top">
            <strong>We need one thing from you:</strong> {application.holdReason || 'See the note below.'}
          </div>
        )}
        {application.status === 'rejected' && application.rejectionReason && (
          <div className="alert alert-danger spacer-top">
            <strong>Reason given:</strong> {application.rejectionReason}
          </div>
        )}
        {application.status === 'issued' && application.approval?.passportNumber && (
          <div className="alert alert-success spacer-top">
            <strong>Passport number:</strong> {application.approval.passportNumber} · Issued{' '}
            {formatDate(application.issuedAt)}
          </div>
        )}
      </div>

      {!isDraft && (
        <div className="panel">
          <div className="panel-head">
            <strong>Where your application stands</strong>
            <span className="tiny muted">You will get a message at every step</span>
          </div>
          <div className="panel-body">
            <div className="timeline">
              {milestoneList.map((step) => (
                <div
                  className={`timeline-item ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}`}
                  key={step.status}
                >
                  <div className="timeline-dot">{step.done ? '✓' : step.current ? '•' : '○'}</div>
                  <div>
                    <h4>{step.label}</h4>
                    <p>
                      {step.current
                        ? statusInfo(step.status).label
                        : step.done
                          ? 'Completed'
                          : 'Still to come'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editing && canEdit ? (
        <div className="panel">
          <div className="panel-head">
            <strong>Your details</strong>
            <span className="tiny muted">All of this is checked before you can send the form</span>
          </div>
          <div className="panel-body stack">
            <div className="form-grid">
              <div className="field">
                <label className="label">What do you need?</label>
                <select className="select" value={form.serviceType} onChange={(e) => setField(null, 'serviceType', e.target.value)}>
                  <option value="fresh">New passport</option>
                  <option value="renewal">Renew my passport</option>
                  <option value="lost">Lost passport</option>
                  <option value="damaged">Damaged passport</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Processing speed</label>
                <select className="select" value={form.category} onChange={(e) => setField(null, 'category', e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="tatkal">Urgent (Tatkal)</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="label">First name</label>
                <input className="input" value={form.personal.firstName} onChange={(e) => setField('personal', 'firstName', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Last name</label>
                <input className="input" value={form.personal.lastName} onChange={(e) => setField('personal', 'lastName', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={form.personal.dob} onChange={(e) => setField('personal', 'dob', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Gender</label>
                <select className="select" value={form.personal.gender} onChange={(e) => setField('personal', 'gender', e.target.value)}>
                  <option value="">Choose one</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Marital status</label>
                <select className="select" value={form.personal.maritalStatus} onChange={(e) => setField('personal', 'maritalStatus', e.target.value)}>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Place of birth</label>
                <input className="input" value={form.personal.placeOfBirth} onChange={(e) => setField('personal', 'placeOfBirth', e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="label">Email address</label>
                <input className="input" type="email" value={form.contact.email} onChange={(e) => setField('contact', 'email', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Phone number</label>
                <input className="input" value={form.contact.phone} onChange={(e) => setField('contact', 'phone', e.target.value)} />
              </div>
              <div className="field full">
                <label className="label">House number and street</label>
                <input className="input" placeholder="22, MG Road" value={form.contact.addressLine} onChange={(e) => setField('contact', 'addressLine', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">City</label>
                <input className="input" value={form.contact.city} onChange={(e) => setField('contact', 'city', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">State</label>
                <input className="input" value={form.contact.state} onChange={(e) => setField('contact', 'state', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Pincode</label>
                <input className="input" maxLength={6} placeholder="6 digits" value={form.contact.pincode} onChange={(e) => setField('contact', 'pincode', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Passport office</label>
                <select className="select" value={form.office} onChange={(e) => setField(null, 'office', e.target.value)}>
                  <option value="">Choose an office</option>
                  {offices.map((office) => (
                    <option key={office._id} value={office._id}>
                      {office.name} — {office.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="label">Father&apos;s name</label>
                <input className="input" value={form.family.fatherName} onChange={(e) => setField('family', 'fatherName', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Mother&apos;s name</label>
                <input className="input" value={form.family.motherName} onChange={(e) => setField('family', 'motherName', e.target.value)} />
              </div>
              {form.personal.maritalStatus === 'married' && (
                <div className="field">
                  <label className="label">Spouse&apos;s name</label>
                  <input className="input" value={form.family.spouseName} onChange={(e) => setField('family', 'spouseName', e.target.value)} />
                </div>
              )}
            </div>

            {form.serviceType !== 'fresh' && (
              <div className="form-grid">
                <div className="field">
                  <label className="label">Old passport number</label>
                  <input className="input" value={form.previousPassport.number} onChange={(e) => setField('previousPassport', 'number', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Expiry date</label>
                  <input className="input" type="date" value={form.previousPassport.expiryDate} onChange={(e) => setField('previousPassport', 'expiryDate', e.target.value)} />
                </div>
              </div>
            )}

            <div className="stack" style={{ gap: 10 }}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.declarations.criminalCase}
                  onChange={(e) => setField('declarations', 'criminalCase', e.target.checked)}
                />
                <span>I have a criminal case against me (tell us the truth — it does not automatically reject you)</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.declarations.passportDenied}
                  onChange={(e) => setField('declarations', 'passportDenied', e.target.checked)}
                />
                <span>My passport was refused or impounded earlier</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.declarations.agreesToTerms}
                  onChange={(e) => setField('declarations', 'agreesToTerms', e.target.checked)}
                />
                <span>
                  Everything I have written is true to the best of my knowledge, and I agree to the
                  terms of use.
                </span>
              </label>
            </div>

            <div className="row">
              <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
                {busy ? <span className="spinner" /> : 'Save and continue later'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => setEditing(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <strong>Your details</strong>
            {canEdit && (
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
          </div>
          <div className="panel-body">
            <div className="grid-3">
              <div>
                <div className="tiny muted">Full name</div>
                <strong>
                  {application.personal.firstName} {application.personal.lastName}
                </strong>
                <div className="small muted">
                  {application.personal.gender ? application.personal.gender : '—'} ·{' '}
                  {formatDate(application.personal.dob)}
                </div>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  {application.contact.addressLine}, {application.contact.city}, {application.contact.state}{' '}
                  {application.contact.pincode}
                </div>
              </div>
              <div>
                <div className="tiny muted">How to reach you</div>
                <div className="small">{application.contact.email || '—'}</div>
                <div className="small">{application.contact.phone || '—'}</div>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  Father: {application.family.fatherName || '—'}
                </div>
                <div className="tiny muted">Mother: {application.family.motherName || '—'}</div>
              </div>
              <div>
                <div className="tiny muted">Declarations</div>
                <div className="small">Criminal case: {application.declarations.criminalCase ? 'Yes' : 'No'}</div>
                <div className="small">Passport refused earlier: {application.declarations.passportDenied ? 'Yes' : 'No'}</div>
                <div className="small">Agreed to terms: {application.declarations.agreesToTerms ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <strong>Documents</strong>
          <span className="tiny muted">{documents.length} uploaded</span>
        </div>
        <div className="panel-body">
          {isOwner && ['draft', 'submitted', 'verification_in_progress', 'on_hold'].includes(application.status) && (
            <form className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }} onSubmit={uploadDocument}>
              <div className="field" style={{ minWidth: 240 }}>
                <label className="label">Kind of document</label>
                <select className="select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ minWidth: 240 }}>
                <label className="label">Choose a file</label>
                <input
                  className="input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={uploading}>
                {uploading ? <span className="spinner" /> : 'Upload'}
              </button>
            </form>
          )}

          {documents.length === 0 ? (
            <EmptyState icon="📎" title="No documents uploaded yet" text="JPG, PNG, WEBP or PDF, up to 5 MB each." />
          ) : (
            documents.map((doc) => {
              const tone =
                doc.reviewStatus === 'approved' ? 'success' : doc.reviewStatus === 'rejected' ? 'danger' : 'warning';
              return (
                <div className="doc-row" key={doc._id}>
                  <div>
                    <strong className="small">{DOCUMENT_LABEL[doc.type] || doc.type}</strong>
                    <div className="tiny muted">
                      {doc.originalName} · {formatBytes(doc.size)} · Added {formatDate(doc.createdAt)}
                    </div>
                    {doc.reviewRemark && <div className="tiny">Note: {doc.reviewRemark}</div>}
                  </div>
                  <div className="row">
                    <span className={`badge badge-${tone}`}>{doc.reviewStatus}</span>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => openDocument(doc._id)}
                    >
                      Open
                    </button>
                    {isOwner && doc.reviewStatus === 'pending' && (
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeDocument(doc._id)}>
                        Remove
                      </button>
                    )}
                    {can(user, 'document:review') && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          type="button"
                          onClick={() => reviewDocument(doc._id, 'approved')}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => {
                            setReviewTarget(reviewTarget === doc._id ? null : doc._id);
                            setReviewRemark('');
                          }}
                        >
                          Refuse
                        </button>
                      </>
                    )}
                  </div>

                  {reviewTarget === doc._id && (
                    <div className="row" style={{ width: '100%' }}>
                      <input
                        className="input"
                        placeholder="Tell the applicant what to fix"
                        value={reviewRemark}
                        onChange={(e) => setReviewRemark(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => reviewDocument(doc._id, 'rejected')}>
                        Send note
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <strong>Your decision</strong>
            <span className="tiny muted">Only your role can take these steps</span>
          </div>
          <div className="panel-body stack">
            <div className="field">
              <label className="label">Remark for the applicant (needed for refuse / send back)</label>
              <textarea
                className="textarea"
                placeholder="For example: The address proof is blurred. Please upload a clearer copy."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {actions.map((item) => (
                <button
                  key={item.action}
                  className={`btn ${item.tone}`}
                  type="button"
                  disabled={busy}
                  onClick={() => move(item.action)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <strong>Everything that has happened</strong>
          <span className="tiny muted">Full record, oldest first</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Step taken</th>
                <th>By</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={`${entry.at}-${index}`}>
                  <td className="muted">{formatDateTime(entry.at)}</td>
                  <td>
                    <span className="badge badge-info">{statusInfo(entry.status).label}</span>
                  </td>
                  <td>{entry.byRole || 'system'}</td>
                  <td className="muted">{entry.remark || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
