import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout engine, so scrolling is a no-op in tests.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
