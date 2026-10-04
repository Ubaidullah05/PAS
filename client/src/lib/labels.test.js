import { describe, expect, it } from 'vitest';
import {
  ROLE_LABELS,
  SERVICE_LABELS,
  can,
  formatBytes,
  formatDate,
  milestonesFor,
  statusInfo
} from './labels';

describe('statusInfo', () => {
  it('explains every status in plain English', () => {
    expect(statusInfo('draft').label).toBe('Not sent yet');
    expect(statusInfo('submitted').label).toBe('Waiting for documents check');
    expect(statusInfo('issued').label).toBe('Passport issued');
  });

  it('falls back safely for unknown statuses', () => {
    expect(statusInfo('something_else')).toEqual({
      label: 'something_else',
      tone: 'neutral',
      icon: '•'
    });
  });
});

describe('milestonesFor', () => {
  it('marks the first milestone as current for a submitted application', () => {
    const steps = milestonesFor({ status: 'submitted', statusHistory: [] });
    expect(steps[0].current).toBe(true);
    expect(steps[0].done).toBe(true);
    expect(steps.at(-1).done).toBe(false);
  });

  it('keeps later milestones untouched when nothing was reached', () => {
    const steps = milestonesFor({ status: 'draft', statusHistory: [] });
    expect(steps.every((step) => !step.done)).toBe(true);
  });
});

describe('can (UI permission mirror)', () => {
  it('gives applicants their own file only', () => {
    const applicant = { role: 'applicant' };
    expect(can(applicant, 'application:read:own')).toBe(true);
    expect(can(applicant, 'application:read:any')).toBe(false);
    expect(can(applicant, 'user:manage')).toBe(false);
  });

  it('never lets a verifier or officer manage people', () => {
    expect(can({ role: 'verifier' }, 'user:manage')).toBe(false);
    expect(can({ role: 'officer' }, 'user:manage')).toBe(false);
  });

  it('only administrators can open time slots and read the audit trail', () => {
    expect(can({ role: 'admin' }, 'appointment:slots')).toBe(true);
    expect(can({ role: 'admin' }, 'audit:view')).toBe(true);
    expect(can({ role: 'officer' }, 'appointment:slots')).toBe(false);
    expect(can({ role: 'verifier' }, 'audit:view')).toBe(false);
  });

  it('says no when there is no user', () => {
    expect(can(null, 'application:read:own')).toBe(false);
  });
});

describe('labels and formatters', () => {
  it('labels every role, service and file type', () => {
    expect(ROLE_LABELS.admin).toBe('System Administrator');
    expect(SERVICE_LABELS.tatkal).toBeUndefined();
    expect(SERVICE_LABELS.renewal).toBe('Renew my passport');
  });

  it('formats dates in a readable way', () => {
    expect(formatDate('2026-01-05')).toContain('2026');
    expect(formatDate(null)).toBe('—');
  });

  it('formats file sizes', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(0)).toBe('0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
