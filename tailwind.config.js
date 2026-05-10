/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green': '#004A29',
        'brand-green-dark': '#003620',
        'brand-green-light': '#0a6b41',
        'brand-white': '#F9F9F7',
        'brand-slate': '#4A4A4A',
        'brand-gold': '#B8893A',
        'brand-leaf': '#7FB069',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 74, 41, 0.06), 0 1px 2px rgba(0, 74, 41, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 74, 41, 0.08), 0 2px 4px rgba(0, 74, 41, 0.04)',
      },
    },
  },
  plugins: [],
};
