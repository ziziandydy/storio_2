/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  theme: {
    extend: {
      colors: {
        'folio-black': '#0d0d0d',
        'accent-gold': '#c5a059',
        'card-surface': '#121212',
        'folio-outline': '#2a2a2a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    }
  },
  plugins: [],
}
