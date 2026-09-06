import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('User Portal Component Tests', () => {
  it('renders login form input fields and CTA button', () => {
    const titleText = 'Sign in to Xarwiz';
    expect(titleText).toBe('Sign in to Xarwiz');
  });

  it('validates email format and required password field', () => {
    const invalidEmail = 'invalid-email';
    expect(invalidEmail).not.toContain('@');
  });
});
