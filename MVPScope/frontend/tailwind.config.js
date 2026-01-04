/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-green': '#22c55e',
        'status-orange': '#f97316',
        'status-red': '#ef4444',
      },
    },
  },
  plugins: [],
}
