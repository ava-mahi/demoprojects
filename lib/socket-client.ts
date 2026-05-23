'use client';

// Simplified polling-based client for Vercel deployment
// No WebSocket dependencies needed

export function getSocket() {
  // Return a mock socket object for compatibility
  return {
    on: (..._args: any[]) => {},
    off: (..._args: any[]) => {},
    emit: (..._args: any[]) => {},
    disconnect: () => {},
  };
}
