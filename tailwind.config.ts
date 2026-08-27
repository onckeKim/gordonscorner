import type { Config } from 'tailwindcss';

/**
 * Gordon's Corner design tokens.
 *
 * Colors are declared as CSS custom properties (see src/app/globals.css
 * :root) and referenced here via rgb(var(...) / <alpha-value>) so Tailwind's
 * opacity modifiers (e.g. bg-corner-forest/90) keep working.
 *
 * `corner.bg/card/ink/muted/border/accent/accent-dark/confirm/warn/danger`
 * are kept as aliases onto the new palette so every component built before
 * this design-system pass automatically inherits the new colors with zero
 * changes. New components should prefer the semantic names
 * (ivory/white/forest/charcoal/gold/stone/success/warning/error).
 */
function withOpacity(variable: string) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        corner: {
          // Semantic design-system names
          ivory: withOpacity('--color-ivory'),
          white: withOpacity('--color-white'),
          forest: withOpacity('--color-forest'),
          'forest-dark': withOpacity('--color-forest-dark'),
          charcoal: withOpacity('--color-charcoal'),
          gold: withOpacity('--color-gold'),
          'gold-dark': withOpacity('--color-gold-dark'),
          stone: withOpacity('--color-stone'),
          success: withOpacity('--color-success'),
          warning: withOpacity('--color-warning'),
          error: withOpacity('--color-error'),

          // Legacy aliases used by earlier components — same tokens, kept
          // so the whole site inherits the new palette without a rename.
          bg: withOpacity('--color-ivory'),
          card: withOpacity('--color-white'),
          ink: withOpacity('--color-charcoal'),
          muted: withOpacity('--color-muted-text'),
          border: withOpacity('--color-stone'),
          accent: withOpacity('--color-gold'),
          'accent-dark': withOpacity('--color-gold-dark'),
          confirm: withOpacity('--color-success'),
          warn: withOpacity('--color-warning'),
          danger: withOpacity('--color-error'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        script: ['var(--font-script)', 'cursive'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgb(37 37 37 / 0.14)',
        'soft-lg': '0 24px 60px -20px rgb(37 37 37 / 0.22)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
