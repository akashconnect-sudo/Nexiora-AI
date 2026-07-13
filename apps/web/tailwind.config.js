/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [require('@nexiora/ui/tailwind-preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
