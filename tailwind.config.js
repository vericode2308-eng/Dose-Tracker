const { theme } = require('./theme');

const px = value => `${value}px`;
// Text-style classes (text-headline, text-footnote, …) carry size and line height from the
// shared ramp; set weight with font-* classes. Colors stay on the runtime theme because they
// change with light/dark mode.
const fontSize = Object.fromEntries(Object.entries(theme.typography).map(([name, style]) =>
  [name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase(), [px(style.fontSize), { lineHeight: px(style.lineHeight) }]]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...theme.colors, luminous: theme.colors.background, medical: theme.palette.navy },
      fontSize,
      borderRadius: Object.fromEntries(Object.entries(theme.radii).map(([name, value]) => [name, px(value)])),
    },
  },
  plugins: [],
};
