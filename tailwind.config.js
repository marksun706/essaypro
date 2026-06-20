/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b8c1',
          400: '#9191a0',
          500: '#747485',
          600: '#5d5d6c',
          700: '#4c4c58',
          800: '#41414b',
          900: '#393941',
          950: '#1a1a23',
        },
        parchment: {
          50: '#fefcf8',
          100: '#fdf8ed',
          200: '#f9eed1',
          300: '#f3dfab',
          400: '#ebcb7b',
          500: '#e3b54f',
          600: '#d99d32',
          700: '#b47b26',
          800: '#906224',
          900: '#755021',
          950: '#3f2a0e',
        },
        aurora: {
          50: '#f0f7fe',
          100: '#ddedfb',
          200: '#c2dff9',
          300: '#97cbf5',
          400: '#65aeee',
          500: '#408fe7',
          600: '#2b72db',
          700: '#235fc9',
          800: '#224da3',
          900: '#204281',
          950: '#172a4f',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card': '0 1px 4px 0 rgba(0,0,0,0.04), 0 2px 8px 0 rgba(0,0,0,0.02)',
        'elevated': '0 2px 8px 0 rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.06)',
        'modal': '0 4px 16px 0 rgba(0,0,0,0.06), 0 16px 48px -8px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in-right': 'slideInRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
