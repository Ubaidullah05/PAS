import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AppProvider } from './context/AppContext';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('public routes', () => {
  it('shows the home page to visitors', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it('shows the sign in form', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the sign up form', () => {
    renderAt('/register');
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('explains how the system works', () => {
    renderAt('/how-it-works');
    expect(screen.getByText('What each status means')).toBeInTheDocument();
  });

  it('answers questions on the help page', () => {
    renderAt('/help');
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument();
  });

  it('sends unknown pages to a friendly not found screen', () => {
    renderAt('/definitely-not-a-page');
    expect(screen.getByRole('heading', { name: 'This page took a wrong turn' })).toBeInTheDocument();
  });
});

describe('protected routes', () => {
  it('sends a signed out visitor to the sign in page', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sends a signed out visitor away from admin pages too', () => {
    renderAt('/admin/users');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
