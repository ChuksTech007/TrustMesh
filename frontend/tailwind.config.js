/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          primary: '#00EC97', // NEAR Emerald green
          secondary: '#6366F1', // Indigo
          accent: '#38BDF8', // Sky blue
          escrow: '#F59E0B', // Amber
          danger: '#EF4444',
        }
      }
    },
  },
  plugins: [],
}

