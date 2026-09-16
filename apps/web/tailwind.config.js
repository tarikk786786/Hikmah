/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#0B0F17',
          card: '#111827',
          border: '#1E293B',
          cyan: '#00F0FF',
          blue: '#0284C7',
          amber: '#F59E0B',
          red: '#EF4444',
          text: '#F1F5F9',
          muted: '#94A3B8'
        }
      }
    },
  },
  plugins: [],
};
