/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#FFFFFF',
          surface: '#FAFAFA',
          border: '#E5E7EB',
          text: '#111827',
          textSecondary: '#6B7280',
          black: '#0F1419',
          blackHover: '#272C30',
          error: '#EF4444',
          success: '#10B981',
        }
      }
    },
  },
  plugins: [],
}
