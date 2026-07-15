/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#071A1F',
          secondary: '#0D2530',
        },
        surface: {
          card: 'rgba(255, 255, 255, 0.06)',
          glass: 'rgba(255, 255, 255, 0.08)',
        },
        blueAccent: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#60A5FA',
        },
        greenAccent: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#34D399',
        },
        textCol: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
        borderCol: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          focused: '#10B981',
          hover: 'rgba(59, 130, 246, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'glass': '18px',
      },
      boxShadow: {
        'glass': '0 10px 30px rgba(0, 0, 0, 0.18)',
      }
    },
  },
  plugins: [],
}
