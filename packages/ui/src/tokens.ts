/**
 * Nexiora design tokens — editorial tech, restrained teal accent.
 * Avoid purple-gradient AI cliché (see UI/UX plan).
 */
export const nexioraTokens = {
  colors: {
    light: {
      bg: '#F4F6F8',
      bgElevated: '#FFFFFF',
      ink: '#12151A',
      inkMuted: '#5C6570',
      border: '#D7DDE3',
      accent: '#0F766E',
      accentSoft: '#CCFBF1',
      danger: '#B42318',
    },
    dark: {
      bg: '#0E1116',
      bgElevated: '#171B22',
      ink: '#E8ECF1',
      inkMuted: '#9AA3AD',
      border: '#2A313C',
      accent: '#2DD4BF',
      accentSoft: '#134E4A',
      danger: '#F97066',
    },
  },
  fonts: {
    display: '"Satoshi", "General Sans", "Avenir Next", system-ui, sans-serif',
    body: '"Satoshi", "General Sans", "Avenir Next", system-ui, sans-serif',
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
} as const;

export type NexioraTokens = typeof nexioraTokens;
