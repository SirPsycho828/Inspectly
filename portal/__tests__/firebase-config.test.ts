import { describe, it, expect } from 'vitest';

describe('Firebase config', () => {
  it('reads config from environment variables', () => {
    // Ensure firebase.ts uses env vars, not hardcoded keys
    const fs = require('fs');
    const path = require('path');
    const firebaseTs = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'lib', 'firebase.ts'),
      'utf-8',
    );

    expect(firebaseTs).toContain('process.env.NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(firebaseTs).not.toMatch(/AIzaSy/);
  });
});

describe('Environment', () => {
  it('has .env.example documenting required vars', () => {
    const fs = require('fs');
    const path = require('path');
    const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf-8');

    expect(envExample).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    expect(envExample).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  });
});
