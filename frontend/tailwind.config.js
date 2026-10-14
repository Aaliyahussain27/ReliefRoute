/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1120',
          800: '#0F172A',
          700: '#1E293B',
          600: '#334155',
          500: '#475569',
        },
        relief: {
          orange: '#F97316',
          orangeDark: '#EA580C',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          blue: '#0284C7',
          blueDark: '#0369A1',
        }
      }
    },
  },
  plugins: [],
}
