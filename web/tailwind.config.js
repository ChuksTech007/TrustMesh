/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe6",
        "paper-2": "#e6e0d2",
        ink: "#1a1714",
        "ink-soft": "#4a453d",
        copper: "#a24b2e",
        moss: "#1d4a36",
        walnut: "#14110e",
        line: "#d8d0c2",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        docket: "0 30px 70px -36px rgba(20,17,14,0.55)",
      },
    },
  },
  plugins: [],
};
