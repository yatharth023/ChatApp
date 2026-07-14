/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          DEFAULT: '#0b1120',
          raised: '#111827',
          border: '#1f2937',
          muted: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': {
          '0%': { transform: 'translateY(6px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        typing: {
          '0%,60%,100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-3px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        typing: 'typing 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
