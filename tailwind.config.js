/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // TreeHouse Foods brand palette (2026 brand template).
        // brand-green is the brand sage darkened for UI/text contrast;
        // brand-green-light holds the exact brand sage (#628C7C).
        'brand-green': '#4C7063',
        'brand-green-dark': '#3A564C',
        'brand-green-light': '#628C7C',
        'brand-white': '#FFFFFF',
        'brand-slate': '#333F48',
        'brand-gold': '#B7A87D',
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
        card: '0 1px 3px rgba(51, 63, 72, 0.06), 0 1px 2px rgba(51, 63, 72, 0.04)',
        'card-hover': '0 4px 12px rgba(51, 63, 72, 0.08), 0 2px 4px rgba(51, 63, 72, 0.04)',
      },
    },
  },
  plugins: [],
};
