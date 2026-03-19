/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#06B6D4',
        dark: '#0F172A',
        light: '#F8FAFC',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        'gradient-accent': 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      },
    },
  },
  plugins: [],
}
