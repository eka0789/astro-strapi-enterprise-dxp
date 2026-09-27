/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.ts'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      colors: {
        'at-cyan': '#00f0ff',
        'at-indigo': '#6366f1',
        'at-violet': '#8b5cf6',
        'at-pink': '#ec4899',
        'at-amber': '#f59e0b',
        'at-emerald': '#10b981',
        'at-rose': '#f43f5e',
      },
    },
  },
  plugins: [],
};
