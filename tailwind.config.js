const { theme } = require('./theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...theme.colors, luminous: theme.colors.background, medical: theme.palette.navy },
      borderRadius: { card: '20px', pill: '999px' },
    },
  },
  plugins: [],
};
