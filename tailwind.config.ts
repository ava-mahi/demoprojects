import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#070A12',
          soft: '#0B0F1A',
          card: '#0F1422',
          elev: '#141A2B',
        },
        line: '#1E2438',
        muted: '#7C8499',
        text: '#E6EAF2',
        brand: {
          DEFAULT: '#5B8CFF',
          glow: '#7AA2FF',
        },
        up: '#22D39A',
        down: '#FF4D6D',
        gold: '#F5C97B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(91,140,255,0.25), 0 8px 30px rgba(91,140,255,0.15)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
