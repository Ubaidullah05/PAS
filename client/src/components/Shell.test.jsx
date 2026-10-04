import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { setToken } from '../lib/api';
import Shell from './Shell';

function stubApi(user) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const body = String(url).includes('/auth/me')
        ? { success: true, data: { user } }
        : { success: true, data: { notifications: [], unread: 0 } };
      return { ok: true, status: 200, json: async () => body };
    })
  );
}

/** Mirrors the guard in App.jsx: the shell only appears once a user is known. */
function SignedIn() {
  const { user, booting } = useApp();
  if (booting) return <div>Checking your session…</div>;
  if (!user) return <div>Sign in</div>;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/dashboard" element={<div>Page body</div>} />
      </Route>
    </Routes>
  );
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppProvider>
        <SignedIn />
      </AppProvider>
    </MemoryRouter>
  );
}

beforeEach(() => setToken('test-token'));
afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

describe('sidebar for each role', () => {
  it('gives an applicant only their own pages', async () => {
    stubApi({ name: 'Asha Patel', role: 'applicant' });
    renderShell();

    expect(await screen.findByRole('link', { name: /my applications/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my visits/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /documents to check/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /applications to approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /people & roles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit trail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reports/i })).not.toBeInTheDocument();
  });

  it('gives a verifier the checking queue but no admin tools', async () => {
    stubApi({ name: 'Vikram Shah', role: 'verifier' });
    renderShell();

    expect(await screen.findByRole('link', { name: /documents to check/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /applications to approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /passport offices/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /visit time slots/i })).not.toBeInTheDocument();
  });

  it('gives an officer the approval queue only', async () => {
    stubApi({ name: 'Meena Rao', role: 'officer' });
    renderShell();

    expect(await screen.findByRole('link', { name: /applications to approve/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all applications/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /documents to check/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /audit trail/i })).not.toBeInTheDocument();
  });

  it('gives an admin the whole control room', async () => {
    stubApi({ name: 'Site Admin', role: 'admin' });
    renderShell();

    expect(await screen.findByRole('link', { name: /people & roles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /passport offices/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit time slots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit trail/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /documents to check/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /applications to approve/i })).toBeInTheDocument();
  });
});
