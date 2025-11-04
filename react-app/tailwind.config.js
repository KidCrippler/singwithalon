/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Musical purple color scheme from the original site
        primary: {
          light: '#b19cd9',
          DEFAULT: '#8b5fbf',
          dark: '#6b4596',
        },
        accent: {
          light: '#d4b3ff',
          DEFAULT: '#9370db',
        }
      },
      fontFamily: {
        // Hebrew fonts from original site
        sans: ['Heebo', 'sans-serif'],
        display: ['Secular One', 'sans-serif'],
      },
      boxShadow: {
        'musical': '0 10px 40px -10px rgba(139, 95, 191, 0.6)',
        'musical-glow': '0 0 30px rgba(139, 95, 191, 0.5)',
      },
    },
  },
  plugins: [],
}
