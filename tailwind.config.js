/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'var(--font-sans)', 'sans-serif'],
      },
      colors: {
        primary: {
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
      },
      boxShadow: {
        elevated: '0 20px 50px -20px rgba(79, 70, 229, 0.45)',
      },
    },
  },
  plugins: [],
};
