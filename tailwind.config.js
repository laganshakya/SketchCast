/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0C',
        chalk: '#FAFAFA',
        monolith: {
          canvas: '#0A0A0C',
          card: '#121215',
          elevated: '#18181D',
          subtle: '#1E1E24',
          border: '#27272A',
          'border-strong': '#3F3F46',
        },
        cobalt: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6', // Primary Surgical Accent
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        brand: {
          500: '#3B82F6',
          600: '#2563eb',
        },
        stage: {
          canvas: '#0A0A0C',
          card: '#121215',
          border: '#27272A',
          subtle: '#18181D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        question: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'card': '0 8px 24px -4px rgba(0, 0, 0, 0.45)',
        'modal': '0 24px 60px -12px rgba(0, 0, 0, 0.85)',
        'glow-cobalt': '0 0 24px -4px rgba(59, 130, 246, 0.3)',
      },
      keyframes: {
        'kinetic-reveal': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-beacon': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.85)' },
        },
        'pop-scale': {
          '0%': { transform: 'scale(0.96)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'kinetic-reveal': 'kinetic-reveal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-beacon': 'pulse-beacon 1.8s ease-in-out infinite',
        'pop-scale': 'pop-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
