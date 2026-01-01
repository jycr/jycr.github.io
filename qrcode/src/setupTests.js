import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        // Retourner un hash fictif de 32 bytes pour SHA-256
        return new ArrayBuffer(32);
      }),
    },
  },
  writable: true
});

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(async () => {
      return {
        getTracks: () => [{ stop: vi.fn() }],
      };
    }),
  },
  writable: true
});

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock btoa et atob si nécessaire
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

