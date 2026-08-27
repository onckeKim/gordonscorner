import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        corner: {
          bg: '#faf6f0',
          card: '#ffffff',
          ink: '#2a241d',
          muted: '#847a6d',
          border: '#e7ded1',
          accent: '#8a6b45',
          'accent-dark': '#6b5233',
          confirm: '#3f6b4d',
          warn: '#b3562f',
          danger: '#a13c3c',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(42, 36, 29, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
