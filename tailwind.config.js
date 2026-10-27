/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B2347', 950: '#06142B', 900: '#071731', 700: '#12305C', 600: '#1B3F72' },
        emerald: { DEFAULT: '#07563C', 950: '#032A1D', 900: '#043826', 500: '#0E7A55' },
        gold: { DEFAULT: '#C99A2E', soft: '#E3B744', pale: '#F6EDD3' },
        ivory: '#FAF9F5', sand: '#F2EEE4', charcoal: '#18232E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '1400px' },
    },
  },
  plugins: [],
};
