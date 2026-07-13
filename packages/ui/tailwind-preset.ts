import type { Config } from 'tailwindcss';
import { nexioraTokens } from './src/tokens';

/**
 * Shared Tailwind preset for Nexiora apps.
 */
const preset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        nx: {
          bg: 'var(--nx-bg)',
          elevated: 'var(--nx-bg-elevated)',
          ink: 'var(--nx-ink)',
          muted: 'var(--nx-ink-muted)',
          border: 'var(--nx-border)',
          accent: 'var(--nx-accent)',
          'accent-soft': 'var(--nx-accent-soft)',
          danger: 'var(--nx-danger)',
        },
      },
      fontFamily: {
        display: nexioraTokens.fonts.display.split(','),
        body: nexioraTokens.fonts.body.split(','),
      },
      borderRadius: {
        nx: nexioraTokens.radii.md,
      },
    },
  },
  plugins: [],
};

export default preset;
