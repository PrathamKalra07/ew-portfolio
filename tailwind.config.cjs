/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#102d27',
        cream: '#f4f5ef',
        gold: '#d7f36b',
        ink: '#101914',
        mist: '#e7ebe4',
        cobalt: '#4863f7',
        coral: '#ff735c',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 24px 70px rgba(16, 25, 20, 0.13)',
        soft: '0 12px 36px rgba(16, 25, 20, 0.08)',
      },
    },
  },
  plugins: [],
}
