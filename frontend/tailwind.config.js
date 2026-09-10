/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'honey-amber': '#F59E0B',
        'honey-light': '#FEF3C7',
        'honey-dark':  '#92400E',
        'honey-gold':  '#D97706',
      }
    },
  },
  plugins: [],
}
