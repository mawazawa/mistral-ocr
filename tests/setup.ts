import { expect, afterEach } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend Vitest expect with jest-dom matchers
expect.extend(jestDomMatchers as unknown as Record<string, unknown>);

// Cleanup JSDOM after each test
afterEach(() => {
  cleanup();
});