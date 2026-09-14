/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f8f7f4',
          100: '#f0efe9',
          200: '#e2e0d6',
          300: '#c9c6b8',
          400: '#a8a496',
          500: '#858273',
          600: '#6b685b',
          700: '#524f45',
          800: '#3d3a33',
          900: '#29271f',
          950: '#1c1a15',
        },
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px 0 rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.06), 0 2px 4px 0 rgba(0,0,0,0.04)',
        'float': '0 8px 24px 0 rgba(0,0,0,0.08)',
      },
      animation: {
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
