/** @type {import('tailwindcss').Config} */
export default {
  important: true, // Ensures Tailwind utilities always override legacy CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
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
        'btn-primary': '0 4px 20px rgba(139, 95, 191, 0.3)',
        'btn-primary-hover': '0 8px 30px rgba(139, 95, 191, 0.4)',
        'btn-secondary': '0 8px 25px rgba(139, 95, 191, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8b5fbf 0%, #b19cd9 100%)',
      },
      animation: {
        'musical-glow': 'musical-glow 4s ease-in-out infinite',
      },
      keyframes: {
        'musical-glow': {
          '0%, 100%': { boxShadow: '0 15px 35px rgba(139, 95, 191, 0.3)' },
          '50%': { boxShadow: '0 20px 45px rgba(177, 156, 217, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
