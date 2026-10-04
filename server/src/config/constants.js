const DOCUMENT_TYPES = Object.freeze([
  { value: 'photo', label: 'Recent passport photo' },
  { value: 'id_proof', label: 'Identity proof (Aadhaar / PAN / Voter ID)' },
  { value: 'address_proof', label: 'Address proof (electricity bill / bank statement)' },
  { value: 'dob_proof', label: 'Date of birth proof (birth certificate / school record)' },
  { value: 'old_passport', label: 'Old passport copy (only for renewal)' },
  { value: 'signature', label: 'Scanned signature' }
]);

const DOCUMENT_TYPE_VALUES = Object.freeze(DOCUMENT_TYPES.map((d) => d.value));

const ALLOWED_UPLOAD_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const APPLICATION_PURPOSES = Object.freeze(['submission', 'verification', 'collection']);

module.exports = { DOCUMENT_TYPES, DOCUMENT_TYPE_VALUES, ALLOWED_UPLOAD_MIME, APPLICATION_PURPOSES };
